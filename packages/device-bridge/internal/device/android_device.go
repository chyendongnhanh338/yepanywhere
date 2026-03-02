package device

import (
	"context"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"os/exec"
	"strings"
	"sync"
	"time"

	"github.com/anthropics/yepanywhere/device-bridge/internal/conn"
)

const (
	defaultAndroidBridgePort = 27183
	defaultADBPath           = "adb"
)

// AndroidDevice communicates with the on-device server through an adb-forwarded TCP socket.
type AndroidDevice struct {
	serial string

	rw      io.ReadWriteCloser
	reader  io.Reader
	writer  io.Writer
	closeFn func() error

	width  int32
	height int32

	writeMu   sync.Mutex
	closeOnce sync.Once
	closeErr  error
}

// NewAndroidDevice sets up adb forwarding and connects to the local bridge socket.
func NewAndroidDevice(serial, adbPath string) (*AndroidDevice, error) {
	serial = strings.TrimSpace(serial)
	if serial == "" {
		return nil, fmt.Errorf("android serial is required")
	}
	if strings.TrimSpace(adbPath) == "" {
		adbPath = defaultADBPath
	}

	forwardArg := fmt.Sprintf("tcp:%d", defaultAndroidBridgePort)
	forwardCmd := exec.Command(adbPath, "-s", serial, "forward", forwardArg, forwardArg)
	if out, err := forwardCmd.CombinedOutput(); err != nil {
		return nil, fmt.Errorf("adb forward for %s: %w (%s)", serial, err, strings.TrimSpace(string(out)))
	}

	conn, err := net.DialTimeout("tcp", fmt.Sprintf("127.0.0.1:%d", defaultAndroidBridgePort), 3*time.Second)
	if err != nil {
		return nil, fmt.Errorf("connect to adb-forwarded socket for %s: %w", serial, err)
	}

	return NewAndroidDeviceWithTransport(serial, conn, nil)
}

// NewAndroidDeviceWithTransport creates an AndroidDevice over an existing transport.
// Intended for tests and dependency injection.
func NewAndroidDeviceWithTransport(
	serial string,
	rw io.ReadWriteCloser,
	closeFn func() error,
) (*AndroidDevice, error) {
	serial = strings.TrimSpace(serial)
	if serial == "" {
		serial = "android"
	}
	d := &AndroidDevice{
		serial:  serial,
		rw:      rw,
		reader:  rw,
		writer:  rw,
		closeFn: closeFn,
	}
	if err := d.readHandshake(); err != nil {
		_ = d.Close()
		return nil, err
	}
	return d, nil
}

func (d *AndroidDevice) readHandshake() error {
	var buf [4]byte
	if _, err := io.ReadFull(d.reader, buf[:]); err != nil {
		return fmt.Errorf("read handshake: %w", err)
	}
	d.width = int32(binary.LittleEndian.Uint16(buf[:2]))
	d.height = int32(binary.LittleEndian.Uint16(buf[2:4]))
	return nil
}

// GetFrame requests a frame and decodes the returned JPEG into RGB888.
func (d *AndroidDevice) GetFrame(ctx context.Context, maxWidth int) (*Frame, error) {
	_ = ctx
	_ = maxWidth

	d.writeMu.Lock()
	err := conn.WriteFrameRequest(d.writer)
	d.writeMu.Unlock()
	if err != nil {
		return nil, fmt.Errorf("write frame request: %w", err)
	}

	msgType, payload, err := conn.ReadMessage(d.reader)
	if err != nil {
		return nil, fmt.Errorf("read frame response: %w", err)
	}
	if msgType != conn.TypeFrameResponse {
		return nil, fmt.Errorf("unexpected message type: 0x%02x", msgType)
	}

	rgb, width, height, err := decodeJPEGToRGB(payload)
	if err != nil {
		return nil, err
	}
	d.width = int32(width)
	d.height = int32(height)

	return &Frame{
		Data:   rgb,
		Width:  int32(width),
		Height: int32(height),
	}, nil
}

// SendTouch forwards touch control to the Android device server.
func (d *AndroidDevice) SendTouch(ctx context.Context, touches []TouchPoint) error {
	_ = ctx

	payload, err := json.Marshal(struct {
		Cmd     string       `json:"cmd"`
		Touches []TouchPoint `json:"touches"`
	}{
		Cmd:     "touch",
		Touches: touches,
	})
	if err != nil {
		return fmt.Errorf("marshal touch payload: %w", err)
	}
	return d.writeControl(payload)
}

// SendKey forwards key control to the Android device server.
func (d *AndroidDevice) SendKey(ctx context.Context, key string) error {
	_ = ctx

	payload, err := json.Marshal(struct {
		Cmd string `json:"cmd"`
		Key string `json:"key"`
	}{
		Cmd: "key",
		Key: key,
	})
	if err != nil {
		return fmt.Errorf("marshal key payload: %w", err)
	}
	return d.writeControl(payload)
}

func (d *AndroidDevice) writeControl(payload []byte) error {
	d.writeMu.Lock()
	defer d.writeMu.Unlock()
	if err := conn.WriteControl(d.writer, payload); err != nil {
		return fmt.Errorf("write control: %w", err)
	}
	return nil
}

// ScreenSize returns the last known screen size.
func (d *AndroidDevice) ScreenSize() (width, height int32) {
	return d.width, d.height
}

// Close shuts down the device transport.
func (d *AndroidDevice) Close() error {
	d.closeOnce.Do(func() {
		var err error
		if d.rw != nil {
			err = d.rw.Close()
		}
		if d.closeFn != nil {
			if closeErr := d.closeFn(); err == nil {
				err = closeErr
			}
		}
		d.closeErr = err
	})
	return d.closeErr
}
