# Video Recording Checklist

## Pre-Recording Setup

### 1. Environment Setup
- [ ] Close all unnecessary applications
- [ ] Disable notifications (Do Not Disturb mode)
- [ ] Clear browser cache and cookies
- [ ] Use incognito/private browsing mode
- [ ] Set browser zoom to 100%
- [ ] Close extra browser tabs
- [ ] Disable browser extensions
- [ ] Set screen resolution to 1920x1080
- [ ] Adjust display scaling to 100%

### 2. Demo Data Setup
- [ ] Run demo data setup script: `ts-node demo-data-setup.ts`
- [ ] Verify demo data loaded correctly
- [ ] Login with demo credentials: sarah@example.com / Demo123!
- [ ] Confirm all events are visible
- [ ] Verify notifications are present
- [ ] Check weather data is showing
- [ ] Confirm conflicts are detected

### 3. Recording Software Setup
- [ ] Install/open screen recording software (OBS, Loom, Camtasia)
- [ ] Set recording resolution to 1920x1080
- [ ] Set frame rate to 30 fps minimum
- [ ] Configure audio input (microphone)
- [ ] Test audio levels (speak at normal volume)
- [ ] Set recording area to full screen or browser window
- [ ] Enable cursor highlighting (optional)
- [ ] Disable desktop audio (unless needed)

### 4. Audio Setup
- [ ] Use quality microphone (USB or headset)
- [ ] Test microphone in quiet room
- [ ] Eliminate background noise
- [ ] Have water nearby (stay hydrated)
- [ ] Print narration script for reference
- [ ] Practice reading script aloud 2-3 times
- [ ] Time yourself (should be ~2:45-3:00)

### 5. Browser Setup
- [ ] Open Flo application in browser
- [ ] Navigate to login page
- [ ] Have demo credentials ready
- [ ] Bookmark key pages for quick access
- [ ] Test all navigation flows
- [ ] Verify all features are working
- [ ] Check responsive design (if showing mobile)

---

## Recording Checklist

### Scene 1: Introduction (0:00-0:20)
- [ ] Start recording
- [ ] Show landing page (5 seconds)
- [ ] Click "Get Started"
- [ ] Show login screen
- [ ] Type email: sarah@example.com
- [ ] Type password: Demo123!
- [ ] Click "Login"
- [ ] Wait for dashboard to load
- [ ] **Checkpoint**: Dashboard visible at 0:20

### Scene 2: Calendar View (0:20-0:50)
- [ ] Pan across weekly calendar (left to right)
- [ ] Hover over Sarah's blue events
- [ ] Hover over Tom's green events
- [ ] Hover over Emma's purple events
- [ ] Hover over Jake's orange events
- [ ] Click on an event to open detail modal
- [ ] Show event details for 5 seconds
- [ ] Close modal
- [ ] **Checkpoint**: Calendar overview complete at 0:50

### Scene 3: Dashboard (0:50-1:20)
- [ ] Scroll down to dashboard section
- [ ] Show pie chart (10 seconds)
- [ ] Highlight Work category (45h)
- [ ] Show bar chart
- [ ] Highlight Work row (5h over)
- [ ] Highlight Family Time row (4h under)
- [ ] Show full bar chart comparison
- [ ] **Checkpoint**: Dashboard complete at 1:20

### Scene 4: Smart Features (1:20-2:00)
- [ ] Click notification bell icon
- [ ] Show notification panel (3 alerts)
- [ ] Click on conflict notification
- [ ] Show conflict details
- [ ] Show resolution options
- [ ] Hover over each option
- [ ] Close conflict modal
- [ ] Show time booking suggestion card
- [ ] Click "Accept" on suggestion
- [ ] Show success toast
- [ ] **Checkpoint**: Smart features complete at 2:00

### Scene 5: Additional Features (2:00-2:30)
- [ ] Show weather widget on calendar event
- [ ] Navigate to extracurricular activities page
- [ ] Show Emma's soccer team details
- [ ] Show Jake's piano lessons
- [ ] Display weekly summary notification
- [ ] Show PWA offline indicator
- [ ] **Checkpoint**: Additional features complete at 2:30

### Scene 6: Closing (2:30-3:00)
- [ ] Zoom out from dashboard
- [ ] Quick montage of features (2 seconds each):
  - [ ] Calendar grid
  - [ ] Dashboard charts
  - [ ] Notifications
  - [ ] Time booking
  - [ ] Weather widget
  - [ ] Mobile view (if available)
  - [ ] PWA install prompt
- [ ] Fade to landing page
- [ ] Show "Get Started" CTA
- [ ] Hold for 3 seconds
- [ ] **Checkpoint**: Video complete at 3:00

### Post-Recording
- [ ] Stop recording
- [ ] Save recording file
- [ ] Review footage for issues
- [ ] Check audio quality
- [ ] Verify all scenes captured
- [ ] Note any sections to re-record

---

## Narration Recording Checklist

### Option 1: Record Narration Separately (Recommended)
- [ ] Record video without narration first
- [ ] Record narration audio separately
- [ ] Use VIDEO_DEMO_SCRIPT.md for exact timing
- [ ] Sync narration with video in editing
- [ ] Adjust timing as needed

### Option 2: Record Narration Live
- [ ] Practice script multiple times
- [ ] Have script visible during recording
- [ ] Speak clearly and at moderate pace
- [ ] Pause between scenes for editing
- [ ] Re-record sections if needed

---

## Post-Production Checklist

### Video Editing
- [ ] Import recording into editing software
- [ ] Trim beginning and end
- [ ] Cut out mistakes or pauses
- [ ] Add transitions between scenes
- [ ] Adjust pacing (speed up/slow down sections)
- [ ] Add text overlays for key features
- [ ] Add Flo logo/branding
- [ ] Color grade for consistency

### Audio Editing
- [ ] Sync narration with video
- [ ] Remove background noise
- [ ] Normalize audio levels
- [ ] Add background music (subtle, 20% volume)
- [ ] Add UI sound effects (optional)
- [ ] Fade in/out music at start/end

### Final Touches
- [ ] Add intro title card (optional)
- [ ] Add outro with CTA
- [ ] Add captions/subtitles (optional)
- [ ] Review full video 2-3 times
- [ ] Check for timing issues
- [ ] Verify audio sync
- [ ] Confirm all features shown

### Export Settings
- [ ] Resolution: 1920x1080 (Full HD)
- [ ] Frame rate: 30 fps
- [ ] Format: MP4 (H.264)
- [ ] Bitrate: 8-10 Mbps
- [ ] Audio: 192 kbps
- [ ] File size: Target 50-100 MB

---

## Quality Assurance Checklist

### Visual Quality
- [ ] Video is clear and sharp
- [ ] No pixelation or artifacts
- [ ] Colors are accurate
- [ ] Text is readable
- [ ] Cursor movements are smooth
- [ ] Transitions are clean
- [ ] No jarring cuts

### Audio Quality
- [ ] Narration is clear and audible
- [ ] No background noise
- [ ] Music is not too loud
- [ ] Audio levels are consistent
- [ ] No clipping or distortion
- [ ] Narration syncs with video

### Content Quality
- [ ] All features demonstrated
- [ ] Timing matches script (3:00)
- [ ] Key messages emphasized
- [ ] Demo data looks realistic
- [ ] No errors or bugs visible
- [ ] CTA is clear

### Technical Quality
- [ ] File plays on multiple devices
- [ ] Compatible with web players
- [ ] Loads quickly
- [ ] No buffering issues
- [ ] Captions work (if included)

---

## Troubleshooting

### Common Issues

**Issue**: Recording is laggy or choppy
- **Solution**: Close other applications, reduce recording quality, or use hardware encoding

**Issue**: Audio is out of sync
- **Solution**: Record audio separately and sync in post-production

**Issue**: Demo data not showing correctly
- **Solution**: Re-run demo data setup script, clear browser cache, refresh page

**Issue**: Features not working as expected
- **Solution**: Test all features before recording, restart application if needed

**Issue**: Video file is too large
- **Solution**: Reduce bitrate, compress video, or use more efficient codec

**Issue**: Narration timing is off
- **Solution**: Adjust video speed in editing, or re-record narration with correct timing

---

## Alternative Recording Methods

### Method 1: Live Recording (Fastest)
1. Set up demo data
2. Practice walkthrough 2-3 times
3. Record video with live narration
4. Minimal editing required
5. **Time**: 2-3 hours total

### Method 2: Separate Audio (Best Quality)
1. Record video without narration
2. Record narration separately
3. Sync in post-production
4. Add music and effects
5. **Time**: 4-6 hours total

### Method 3: Animated Presentation (Alternative)
1. Create HTML/CSS animated demo
2. Screen record the animation
3. Add narration
4. **Time**: 6-8 hours total

---

## Resources

### Recommended Software

**Screen Recording**:
- OBS Studio (Free, Windows/Mac/Linux)
- Loom (Free tier, cloud-based)
- Camtasia (Paid, full-featured)
- ScreenFlow (Paid, Mac only)

**Video Editing**:
- DaVinci Resolve (Free, professional)
- Adobe Premiere Pro (Paid, industry standard)
- Final Cut Pro (Paid, Mac only)
- iMovie (Free, Mac only)

**Audio Editing**:
- Audacity (Free, cross-platform)
- Adobe Audition (Paid)
- GarageBand (Free, Mac only)

**Background Music** (Royalty-Free):
- YouTube Audio Library
- Epidemic Sound
- Artlist
- Bensound

---

## Final Checklist

Before publishing:
- [ ] Video is exactly 3:00 minutes (±5 seconds)
- [ ] All features demonstrated clearly
- [ ] Audio is professional quality
- [ ] Video is high resolution (1080p)
- [ ] File size is reasonable (<100 MB)
- [ ] Tested on multiple devices
- [ ] Captions added (if required)
- [ ] Thumbnail created
- [ ] Video title and description written
- [ ] Ready to upload/share

---

## Quick Start Guide

**Fastest path to recording**:

1. Run: `ts-node demo-data-setup.ts`
2. Open Flo in browser (incognito mode)
3. Login: sarah@example.com / Demo123!
4. Start screen recording (OBS/Loom)
5. Follow VIDEO_DEMO_SCRIPT.md narration
6. Record for 3 minutes
7. Stop recording
8. Basic editing (trim, add music)
9. Export as MP4
10. Done!

**Estimated time**: 2-3 hours for first video

Good luck with your recording! 🎬
