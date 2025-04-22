import Peaks, { type PeaksInstance, type PeaksOptions } from 'peaks.js';
import * as macros from "../macros" with { type: "macro" };
// import * as nospam from "can-start-audio-context"
const mediaElement = document.querySelector('audio')!
const overviewElement = document.getElementById("overview")!
const zoomviewElement = document.getElementById("zoomview")!

class Clamped {
  constructor(public value: number, public min: number, public max: number) {
    if (max <= min) {
      throw new Error("Clamped min has to be less than max")
    }
    this.value = Math.max(Math.min(value, max), min)
  }
  inc() {
    this.value = Math.min(this.max, this.value + 1)
    return this.value
  }
  dec() {
    this.value = Math.max(this.min, this.value - 1)
    return this.value
  }
  static new(value: number, min: number, max: number) {
    return new Clamped(value, min, max)
  }
}

class Zoom {
  static levels = [256, 512, 1024, 2048, 4096] as const
  static default(): Zoom {
    return new Zoom(Clamped.new(0, 0, 4))
  }
  constructor(private readonly index: Clamped) {}
  inc(): number {
    return Zoom.levels[this.index.inc()]!
  }
  dec(): number {
    return Zoom.levels[this.index.dec()!]!
  }
}

class Hover {
  static FromElement(element: HTMLElement): Hover {
    return new Hover(element, false)
  }
  constructor(public readonly element: HTMLElement, public hovering: boolean) {
    element.addEventListener("mouseenter", this.enter, { passive: true })
    element.addEventListener("mouseout", this.leave, { passive: true })
  }
  enter: () => void = (): void => {
    this.hovering = true
  }
  leave: () => void = (): void => {
    this.hovering = false
  }
  dispose(): void {
    this.element.removeEventListener("mouseenter", this.enter)
    this.element.removeEventListener("mouseout", this.leave)
  }
}

main()

declare global {
  interface Window {
    context: AudioContext
  }
}

class AudioBuffers {
  static existing = new Map<string, AudioBuffer>()
  static async get(src: string): Promise<AudioBuffer> {
    let buffer = AudioBuffers.existing.get(src);
    if (buffer !== undefined) {
      return buffer
    }
    const response = await fetch(src)
    if (!response.ok) {
      throw new Error(`Failed To Fetch ${src}`)
    }
    buffer = await window.context.decodeAudioData(await response.arrayBuffer())
    AudioBuffers.existing.set(src, buffer)
    return buffer
  }
  static getSync(src: string): AudioBuffer | undefined {
    return AudioBuffers.existing.get(src)
  }
}


async function main() {
  // window.context = await nospam.start(undefined, { sampleRate: 48_000 })
  const src = macros.webm("rosa5.wav")
  const options = getPeaksOptions({
    src,
    dat: macros.dat("rosa5.wav"),
    // buffer: await AudioBuffers.get(src)
  })

  const instance = await PeaksInit(options);

  instance.on('segments.dragend', (ev) => {
    console.log('Current segments:', instance.segments.getSegments());
  });
  instance.on('player.seeked', (time) => {
    console.log("Seeked!", time)
  })

  instance.on('zoomview.click', (ev) => {
    console.log("Zoomview Clicked", ev.time)
  })
  instance.on('zoom.update', (ev) => {
    console.log("Zoom Update", ev)
  })

  const zoomview = instance.views.getView("zoomview")!
  const overview = instance.views.getView("overview")!

  const scale = Zoom.default();
  zoomviewElement.addEventListener("click", (ev: MouseEvent) => {
    if (!ev.altKey) {
      return
    }
    zoomview.setZoom({
      scale: ev.shiftKey ? scale.inc() : scale.dec()
    })
  })

  const zoom = Hover.FromElement(zoomviewElement)

  function zoomPointer(ev: KeyboardEvent) {
    if (!zoom.hovering) {
      return
    }
    const cursor = ev.altKey
      ? ev.shiftKey
        ? "zoom-out"
        : "zoom-in"
      : "default"
    zoomviewElement.style.cursor = cursor
  }

  window.addEventListener("keydown", zoomPointer, {
    passive: true
  })

  window.addEventListener("keyup", zoomPointer, {
    passive: true
  })

  zoomview.enableSeek(true)
  overview.enableSeek(true)

  zoomview.enableMarkerEditing(true)
  zoomview.enableSegmentDragging(true)


  instance.segments.add([
    {
      startTime: 0,
      endTime: 3,
      labelText: 'A',
      // color: "#fff",
      editable: true,
    },
    {
      startTime: 3.14,
      endTime: 4.2,
      // color: '#666',
      labelText: "B",
      editable: true
    }
  ]);
}

async function PeaksInit(options: PeaksOptions): Promise<PeaksInstance> {
  return new Promise<PeaksInstance>((resolve, reject) => {
    Peaks.init(options, (error, instance) => {
      if (instance === undefined) {
        reject(error)
      } else {
        instance.once("peaks.ready", () => {
          resolve(instance)
        })
      }
    })
  })
}

interface SoundProps {
  src: string
  dat: string
  buffer?: AudioBuffer
}
function getPeaksOptions(props: SoundProps): PeaksOptions {
  mediaElement.src = props.src

  const options: PeaksOptions = {
    dataUri: {
      arraybuffer: props.dat,
    },
    mediaElement: mediaElement,
    // webAudio: {
    //   audioBuffer: props.buffer,
    //   audioContext: window.context,
    // },

    zoomview: {
      container: zoomviewElement,

      // Color for the zoomable waveform
      // You can also use a 2 stop gradient here. See setWaveformColor()
      waveformColor: 'rgba(0, 225, 128, 1)',

      // Color for the played region of the zoomable waveform
      // You can also use a 2 stop gradient here. See setWaveformColor()
      playedWaveformColor: 'rgb(1, 83, 48)',

      // Color of the playhead
      playheadColor: 'rgb(255, 255, 255)',

      // Color of the playhead text
      playheadTextColor: 'rgb(255, 255, 255)',

      // Background color of the playhead text
      playheadBackgroundColor: 'transparent',

      // Padding around the playhead text (pixels)
      playheadPadding: 2,

      // Width of the playhead (pixels)
      playheadWidth: 1,

      // Tolerance for clicks in the zoomview to be interpreted as
      // dragging the playhead (pixels)
      playheadClickTolerance: 3,

      // Returns a string for the playhead timestamp label
      // formatPlayheadTime: function,

      // Show current time next to the playhead
      showPlayheadTime: true,

      // Precision of time label of playhead and point/segment markers
      timeLabelPrecision: 2,

      // Color of the axis gridlines
      axisGridlineColor: 'rgb(116, 116, 116)',

      // Color of the axis labels
      axisLabelColor: 'rgb(193, 193, 193)',

      // Returns a string for the axis label timestamps
      // formatAxisTime: function,

      // Show or hide the axis label timestamps
      showAxisLabels: true,

      // Font family for axis labels, playhead, and point and segment markers
      fontFamily: 'sans-serif',

      // Font size for axis labels, playhead, and point and segment markers
      fontSize: 11,

      // Font style for axis labels, playhead, and point and segment markers
      // (either 'normal', 'bold', or 'italic')
      fontStyle: 'normal',

      // Mouse-wheel mode: either 'none' or 'scroll'
      wheelMode: 'scroll',

      // Auto-scroll the waveform when the playhead reaches the edge of
      // the visible waveform
      autoScroll: true,

      // The offset in pixels edge of the visible waveform to trigger
      // auto-scroll
      autoScrollOffset: 100,

      // Enables point markers to be shown on the zoomable waveform
      enablePoints: true,

      // Enables segments to be shown on the zoomable waveform
      enableSegments: true,
      // segmentOptions: {
      //   markers: true,
      //   overlay: true,
      //   overlayColor: 'rgb(0, 4, 255)',
      //   waveformColor: 'rgb(0, 51, 255)',
      //   overlayLabelColor: 'rgb(255, 255, 255)',
      //   overlayOpacity: 1,
      //   startMarkerColor: 'rgb(0, 229, 255)',
      //   endMarkerColor: 'rgb(1, 168, 187)'
      // }
    },
    overview: {
      container: overviewElement,

      // Color for the overview waveform
      // You can also use a 2 stop gradient here. See setWaveformColor()
      waveformColor: 'rgb(94, 255, 164)',

      // Color for the played region of the overview waveform
      // You can also use a 2 stop gradient here. See setWaveformColor()
      playedWaveformColor: 'rgb(0, 103, 58)',

      // Color for the overview waveform rectangle
      // that shows what the zoomable view shows
      highlightColor: 'rgba(255, 255, 255, 0.08)',

      // Stroke color for the zoomed region
      highlightStrokeColor:   'transparent',

      // Opacity for the zoomed region
      highlightOpacity: 1,

      // Corner Radius for the zoomed region
      highlightCornerRadius:  2,

      // The default number of pixels from the top and bottom of the canvas
      // that the overviewHighlight takes up
      highlightOffset: 11,

      // Color of the playhead
      playheadColor: 'rgb(255, 255, 255)',

      // Color of the playhead text
      playheadTextColor: 'rgb(255, 255, 255)',

      // Background color of the playhead text
      playheadBackgroundColor: 'transparent',

      // Padding around the playhead text (pixels)
      playheadPadding: 2,

      // Returns a string for the playhead timestamp label
      // formatPlayheadTime: function,

      // Show current time next to the playhead
      showPlayheadTime: true,

      // Precision of time label of playhead and point/segment markers
      timeLabelPrecision: 2,

      // Color of the axis gridlines
      axisGridlineColor: 'rgb(224, 222, 222)',

      // Color of the axis labels
      axisLabelColor: 'rgb(224, 222, 222)',

      // Returns a string for the axis label timestamps
      // formatAxisTime: function,

      // Show or hide the axis label timestamps
      showAxisLabels: true,

      // Font family for axis labels, playhead, and point and segment markers
      fontFamily: 'sans-serif',

      // Font size for axis labels, playhead, and point and segment markers
      fontSize: 11,

      // Font style for axis labels, playhead, and point and segment markers
      // (either 'normal', 'bold', or 'italic')
      fontStyle: 'normal',

      // Enables point markers to be shown on the overview waveform
      enablePoints: true,

      // Enables segments to be shown on the overview waveform
      enableSegments: true,

      segmentOptions: {
        // Some segment options can be overridden for the overview waveform,
        // see segmentOptions below
      }
    },
    // scrollbar: {
    //   // Container <div> element for the scrollbar
    //   container: document.getElementById('scrollbar-container')!,

    //   // Scrollbar color. The background color can be set using CSS on the
    //   // scrollbar container element
    //   color: '#888888',

    //   // Minimum scrollbar handle width, in pixels
    //   minWidth: 50
    // },
    keyboard: true,
    // Array of zoom levels in samples per pixel. Smaller numbers represent
    // being more "zoomed in".
    zoomLevels: [...Zoom.levels],

    // To avoid computation when changing zoom level, Peaks.js maintains a cache
    // of waveforms at different zoom levels. This is enabled by default, but
    // can be disabled by setting waveformCache to false
    waveformCache: true,

    // Keyboard nudge increment in seconds (left arrow/right arrow)
    nudgeIncrement: 0.01,

    //
    // Default view options. Each of these can be set independently for each
    // waveform view, under the 'zoomview' and 'overview' options
    // (described above).
    //

    // Waveform color
    // You can also use a 2 stop gradient here. See setWaveformColor()
    waveformColor: 'rgba(0, 225, 128, 1)',

    // Color for the played waveform region
    // You can also use a 2 stop gradient here. See setWaveformColor()
    // playedWaveformColor: 'rgba(0, 225, 128, 1)',

    // Color of the playhead
    playheadColor: 'rgb(255, 255, 255)',

    // Color of the playhead text
    playheadTextColor: '#aaa',

    // Background color of the playhead text
    // playheadBackgroundColor: 'transparent',

    // Padding around the playhead text (pixels)
    // playheadPadding: 2,

    // Color of the axis gridlines
    axisGridlineColor: '#ccc',

    // Color of the axis labels
    axisLabelColor: '#aaa',

    // Font family for axis labels, playhead, and point and segment markers
    fontFamily: 'sans-serif',

    // Font size for axis labels, playhead, and point and segment markers
    fontSize: 11,

    // Font style for axis labels, playhead, and point and segment markers
    // (either 'normal', 'bold', or 'italic')
    fontStyle: 'normal',

    // Precision of time label of playhead and point/segment markers
    timeLabelPrecision: 2,

    // Show current time next to the playhead (zoomview only)
    showPlayheadTime: true,

    //
    // Point and segment options
    //

    // Default point marker color
    pointMarkerColor: '#ff0000',

    // if true, emit cue events on the Peaks instance (see Cue Events)
    emitCueEvents: false,

    // Enables point markers to be shown on the waveform views
    // enablePoints: true,

    // Enables segments to be shown on the waveform views
    // enableSegments: true,

    segmentOptions: {
      markers: true,
      overlay: true,
      overlayColor: 'rgba(255, 255, 255, 0.03)',
      waveformColor: 'rgb(0, 51, 255)',
      overlayLabelColor: 'rgb(255, 255, 255)',
      overlayOpacity: 1,
      startMarkerColor: 'rgb(0, 229, 255)',
      endMarkerColor: 'rgb(0, 209, 233)',

      // Segment overlay border color
      overlayBorderColor: 'rgb(0, 229, 255)',

      // Segment overlay border width
      overlayBorderWidth: 2,

      // Segment overlay border corner radius
      overlayCornerRadius: 5,

      // Segment overlay offset from the top and bottom of the waveform view, in pixels
      overlayOffset: 25,

      // Segment overlay label alignment, either 'top-left' or 'center'
      overlayLabelAlign: 'left',

      // Segment overlay label offset, in pixels
      overlayLabelPadding: 8,

      // Segment overlay font family
      overlayFontFamily: 'sans-serif',

      // Segment overlay font size
      overlayFontSize: 12,

      // Segment overlay font style
      overlayFontStyle: 'normal',
    },

    //
    // Customization options (see customizing.md)
    //

    // createSegmentMarker: null,
    // createSegmentLabel: null,
    // createPointMarker: null,
    // player: null,
    logger: console.error.bind(console),
    withCredentials: false,
  }
  return options
}
