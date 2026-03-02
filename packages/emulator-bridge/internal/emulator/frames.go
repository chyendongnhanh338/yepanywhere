package emulator

import (
	"context"
	"sync"
	"sync/atomic"
)

// Frame holds a single screenshot from the emulator.
type Frame struct {
	Data      []byte // RGB888 pixels, bottom-up row order
	Width     int32
	Height    int32
	Seq       uint32
	Timestamp uint64 // microseconds from emulator
}

// FrameSource manages the screenshot stream and distributes frames to subscribers.
type FrameSource struct {
	client    *Client
	maxWidth  int // passed to emulator for server-side scaling (0 = native)
	lastFrame atomic.Pointer[Frame]
	mu        sync.RWMutex
	subs      map[int]chan<- *Frame
	nextID    int
	cancel    context.CancelFunc
}

// NewFrameSource starts streaming screenshots and dispatching to subscribers.
// maxWidth tells the emulator to scale frames server-side (0 = native resolution).
func NewFrameSource(client *Client, maxWidth int) *FrameSource {
	ctx, cancel := context.WithCancel(context.Background())
	fs := &FrameSource{
		client:   client,
		maxWidth: maxWidth,
		subs:     make(map[int]chan<- *Frame),
		cancel:   cancel,
	}
	go fs.run(ctx)
	return fs
}

// Subscribe returns a channel that receives frames.
// Slow consumers will have frames dropped (non-blocking send).
// If a frame has already been received, it is immediately sent to the new subscriber
// so that late-joining consumers (e.g. the encoding pipeline) don't miss the initial frame.
func (fs *FrameSource) Subscribe() (id int, ch <-chan *Frame) {
	fs.mu.Lock()
	defer fs.mu.Unlock()

	id = fs.nextID
	fs.nextID++
	c := make(chan *Frame, 2)
	fs.subs[id] = c

	// Replay the last frame so subscribers that join after the initial
	// gRPC frame was received still get something to encode.
	if last := fs.lastFrame.Load(); last != nil {
		c <- last
	}

	return id, c
}

// Unsubscribe removes a subscriber.
func (fs *FrameSource) Unsubscribe(id int) {
	fs.mu.Lock()
	defer fs.mu.Unlock()

	if ch, ok := fs.subs[id]; ok {
		close(ch)
		delete(fs.subs, id)
	}
}

// LastFrame returns the most recently received frame, or nil if none yet.
func (fs *FrameSource) LastFrame() *Frame {
	return fs.lastFrame.Load()
}

// Stop shuts down the frame source.
func (fs *FrameSource) Stop() {
	fs.cancel()
}

func (fs *FrameSource) run(ctx context.Context) {
	frames := fs.client.PollScreenshots(ctx, fs.maxWidth)

	for frame := range frames {
		fs.lastFrame.Store(frame)
		fs.dispatch(frame)
	}
}

func (fs *FrameSource) dispatch(frame *Frame) {
	fs.mu.RLock()
	defer fs.mu.RUnlock()

	for _, ch := range fs.subs {
		// Non-blocking send — drop frame for slow consumers.
		select {
		case ch <- frame:
		default:
		}
	}
}
