package device

import (
	"context"
	"encoding/binary"
	"io"
	"net"
	"strings"
	"testing"
	"time"

	"github.com/anthropics/yepanywhere/device-bridge/internal/conn"
)

func TestAndroidDeviceWithMockTCPServer(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	defer ln.Close()

	done := make(chan error, 1)
	go func() {
		srvConn, err := ln.Accept()
		if err != nil {
			done <- err
			return
		}
		defer srvConn.Close()

		var handshake [4]byte
		binary.LittleEndian.PutUint16(handshake[:2], 2)
		binary.LittleEndian.PutUint16(handshake[2:], 1)
		if _, err := srvConn.Write(handshake[:]); err != nil {
			done <- err
			return
		}

		controlPayloads := make([]string, 0, 2)
		for len(controlPayloads) < 2 {
			msgType, payload, err := conn.ReadMessage(srvConn)
			if err != nil {
				done <- err
				return
			}

			switch msgType {
			case conn.TypeFrameRequest:
				if err := conn.WriteFrameResponse(srvConn, testJPEG(2, 1)); err != nil {
					done <- err
					return
				}
			case conn.TypeControl:
				controlPayloads = append(controlPayloads, string(payload))
			default:
				done <- errUnexpectedMessageType(msgType)
				return
			}
		}

		if !strings.Contains(controlPayloads[0], `"cmd":"key"`) &&
			!strings.Contains(controlPayloads[1], `"cmd":"key"`) {
			done <- errString("missing key control payload")
			return
		}
		if !strings.Contains(controlPayloads[0], `"cmd":"touch"`) &&
			!strings.Contains(controlPayloads[1], `"cmd":"touch"`) {
			done <- errString("missing touch control payload")
			return
		}

		done <- nil
	}()

	clientConn, err := net.Dial("tcp", ln.Addr().String())
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	defer clientConn.Close()

	d, err := NewAndroidDeviceWithTransport("R3CN90ABCDE", clientConn, nil)
	if err != nil {
		t.Fatalf("new device: %v", err)
	}
	defer d.Close()

	w, h := d.ScreenSize()
	if w != 2 || h != 1 {
		t.Fatalf("unexpected handshake dimensions: %dx%d", w, h)
	}

	frame, err := d.GetFrame(context.Background(), 0)
	if err != nil {
		t.Fatalf("GetFrame: %v", err)
	}
	if frame.Width != 2 || frame.Height != 1 {
		t.Fatalf("unexpected frame dimensions: %dx%d", frame.Width, frame.Height)
	}
	if len(frame.Data) != 6 {
		t.Fatalf("expected RGB frame length 6, got %d", len(frame.Data))
	}

	if err := d.SendKey(context.Background(), "back"); err != nil {
		t.Fatalf("SendKey: %v", err)
	}
	if err := d.SendTouch(context.Background(), []TouchPoint{{X: 0.25, Y: 0.5, Pressure: 1.0}}); err != nil {
		t.Fatalf("SendTouch: %v", err)
	}

	select {
	case err := <-done:
		if err != nil && err != io.EOF {
			t.Fatalf("mock server goroutine: %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timeout waiting for mock server goroutine")
	}
}
