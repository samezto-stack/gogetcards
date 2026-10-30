import math, struct, random, wave

SR = 44100

def bell(t, f0, tau, partials=((1.0,1.0),(2.76,0.62),(5.40,0.34),(8.93,0.18))):
    """Struck-metal tone: inharmonic partials with exponential decay.
       The inharmonic ratios are what make it read as 'bell' rather than
       'beep' — a pure sine sounds like an alarm clock."""
    env = math.exp(-t / tau)
    return env * sum(a * math.sin(2 * math.pi * f0 * r * t) for r, a in partials) / 2.14

def render():
    dur = 1.0
    n = int(SR * dur)
    buf = [0.0] * n
    random.seed(7)

    # Drawer mechanism: a very short noise transient. Gives the attack a
    # mechanical edge so it doesn't sound like a doorbell.
    for i in range(int(SR * 0.045)):
        t = i / SR
        buf[i] += 0.30 * (random.uniform(-1, 1)) * math.exp(-t / 0.010)

    # "Cha" — lower strike.
    for i in range(n):
        t = i / SR
        buf[i] += 0.85 * bell(t, 1046.5, 0.17)

    # "Ching" — higher strike, ~110ms later, rings longer. The rising
    # interval is what makes it read as a completed sale rather than an error.
    off = int(SR * 0.11)
    for i in range(off, n):
        t = (i - off) / SR
        buf[i] += 1.00 * bell(t, 1568.0, 0.42)

    # Gentle fade so the tail can't click.
    fade = int(SR * 0.05)
    for i in range(fade):
        buf[n - 1 - i] *= i / fade

    peak = max(abs(v) for v in buf) or 1.0
    return [max(-1.0, min(1.0, v / peak * 0.89)) for v in buf]

samples = render()
pcm_be = b''.join(struct.pack('>h', int(v * 32767)) for v in samples)
pcm_le = b''.join(struct.pack('<h', int(v * 32767)) for v in samples)

# ── CAF (what Bark imports) ──
# Big-endian container: 'caff' header, a 'desc' chunk describing the
# format, then a 'data' chunk. Written by hand because this ffmpeg build
# has no CAF muxer.
out = bytearray()
out += b'caff' + struct.pack('>HH', 1, 0)
out += b'desc' + struct.pack('>q', 32)
out += struct.pack('>d', float(SR))          # sample rate
out += b'lpcm'                                # format id
out += struct.pack('>I', 0)                   # flags: signed int, big-endian
out += struct.pack('>I', 2)                   # bytes per packet
out += struct.pack('>I', 1)                   # frames per packet
out += struct.pack('>I', 1)                   # channels
out += struct.pack('>I', 16)                  # bits per channel
out += b'data' + struct.pack('>q', len(pcm_be) + 4) + struct.pack('>I', 0) + pcm_be
open('cha-ching.caf', 'wb').write(bytes(out))

# ── WAV (so it can be previewed anywhere) ──
w = wave.open('cha-ching.wav', 'wb')
w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
w.writeframes(pcm_le); w.close()

print(f'cha-ching.caf  {len(out):,} bytes   {len(samples)/SR:.2f}s  {SR} Hz mono 16-bit')
