# ServicePro PWA + Offline Functionality QA Checklist

## Overview
This checklist validates the implementation of PWA (Progressive Web App) and offline-first capabilities for the ServicePro technician experience.

## Prerequisites
- ✅ Node.js and npm installed
- ✅ Project dependencies installed (`npm install`)
- ✅ Build process working (`npm run build`)
- ✅ Development server running (`npm run dev`)

## 1. PWA Installation & Manifest

### Android Testing
- [ ] Open app in Chrome on Android
- [ ] Tap the three-dot menu → "Add to Home screen"
- [ ] Confirm app icon appears on home screen
- [ ] Tap icon to launch app in standalone mode
- [ ] Verify no browser UI (address bar, navigation) visible
- [ ] App launches with ServicePro branding and icon

### iOS Testing
- [ ] Open app in Safari on iOS
- [ ] Tap share button → "Add to Home Screen"
- [ ] Confirm app icon appears on home screen
- [ ] Tap icon to launch app in standalone mode
- [ ] Verify app displays correctly in standalone mode

### Manifest Validation
- [ ] Run Lighthouse PWA audit in Chrome DevTools
- [ ] Verify "Installable" score is 100%
- [ ] Check that all manifest fields are properly set:
  - App name: "ServicePro"
  - Short name: "ServicePro"
  - Theme color matches app design
  - Proper icons (192x192, 512x512) are present

## 2. Service Worker & Caching

### Service Worker Installation
- [ ] Open Chrome DevTools → Application tab → Service Workers
- [ ] Verify service worker is registered and active
- [ ] Check that precache contains expected resources
- [ ] Confirm runtime caching rules are applied

### Offline Network Testing
- [ ] Enable "Offline" mode in Chrome DevTools
- [ ] Verify app loads cached resources
- [ ] Test navigation between routes while offline
- [ ] Confirm no console errors for missing resources

## 3. Offline Job Management

### Job List Offline Access
- [ ] Load WorkerDashboard while online
- [ ] Enable airplane mode or disconnect network
- [ ] Refresh the page
- [ ] Verify jobs list loads from cache
- [ ] Confirm job details are accessible offline
- [ ] Check that UI shows "Offline" status

### Job Details Offline Access
- [ ] Click on a job to open details while online
- [ ] Enable offline mode
- [ ] Navigate to job details
- [ ] Verify job information displays from cache
- [ ] Test all job detail tabs (workflow, documentation, parts)

## 4. Offline Job Status Changes

### Check-in/Check-out Offline
- [ ] While offline, open a job in "scheduled" status
- [ ] Click "Start Job" (check-in) in workflow stepper
- [ ] Verify job status changes to "in_progress" immediately
- [ ] Check that action is queued for sync (pending badge appears)
- [ ] Complete the job by clicking "Complete Job"
- [ ] Verify job status changes to "completed"
- [ ] Confirm both actions are queued

### Visual Feedback for Offline Actions
- [ ] Verify workflow stepper buttons show disabled state when offline
- [ ] Check that pending sync badges appear on jobs with queued actions
- [ ] Confirm offline banner is displayed at top of dashboard
- [ ] Verify sync button shows correct state (disabled when offline)

## 5. Offline Photo Upload

### Photo Capture Offline
- [ ] While offline, open job details → Documentation tab
- [ ] Click "Before Work" photo button
- [ ] Select or capture a photo
- [ ] Verify photo appears immediately in the UI
- [ ] Check that photo upload is queued (pending badge appears)
- [ ] Confirm success message mentions queuing

### Photo Queue Management
- [ ] Take multiple photos while offline
- [ ] Verify each photo shows in the UI immediately
- [ ] Check that pending sync count increases for the job
- [ ] Confirm all photos are queued properly

## 6. Offline Notes

### Note Creation Offline
- [ ] While offline, open job details
- [ ] Add text in work notes field
- [ ] Click save or submit
- [ ] Verify note appears in UI immediately
- [ ] Check that note action is queued for sync
- [ ] Confirm pending badge appears on job

## 7. Sync Functionality

### Auto-sync on Reconnect
- [ ] Perform several offline actions (check-in, photo, note)
- [ ] Verify all actions show pending sync badges
- [ ] Reconnect to network
- [ ] Wait for auto-sync to complete
- [ ] Confirm pending badges disappear
- [ ] Verify success toast appears
- [ ] Check that actions were actually synced to server

### Manual Sync
- [ ] Perform offline actions
- [ ] While still offline, click the "Sync" button
- [ ] Verify button shows disabled state (should be disabled offline)
- [ ] Reconnect to network
- [ ] Click "Sync" button
- [ ] Verify sync process starts and completes
- [ ] Confirm all pending actions are processed

### Sync Error Handling
- [ ] Perform offline actions
- [ ] Reconnect to network
- [ ] Verify sync attempts to process all queued actions
- [ ] If sync fails, confirm actions remain queued
- [ ] Check that error messages are displayed appropriately
- [ ] Verify failed actions can be retried on next sync

## 8. Performance Validation

### Bundle Size Optimization
- [ ] Run `npm run build`
- [ ] Verify main bundle is under 500KB (currently ~672KB)
- [ ] Confirm WorkerDashboard loads in separate chunk (~33KB)
- [ ] Check that PDF generator loads separately (~365KB)
- [ ] Verify lazy loading doesn't cause layout shifts

### Loading Performance
- [ ] Navigate to WorkerDashboard route
- [ ] Verify Suspense loading spinner appears briefly
- [ ] Confirm dashboard loads within 2-3 seconds
- [ ] Test navigation between jobs while offline
- [ ] Verify no unnecessary re-renders

## 9. Data Integrity & Security

### Cache Consistency
- [ ] Load jobs while online
- [ ] Go offline and modify job data
- [ ] Reconnect and sync
- [ ] Verify server data matches local changes
- [ ] Check that cache is updated with latest server data

### Error Recovery
- [ ] Perform actions while offline
- [ ] Disconnect network during sync process
- [ ] Reconnect and verify sync resumes properly
- [ ] Check that partial sync failures don't corrupt data

## 10. Cross-Browser Testing

### Chrome Desktop
- [ ] Test all offline functionality in Chrome
- [ ] Verify PWA installation prompt appears
- [ ] Test service worker registration
- [ ] Confirm caching works correctly

### Firefox
- [ ] Test offline functionality in Firefox
- [ ] Verify service worker support (limited compared to Chrome)
- [ ] Check that offline features work where supported

### Safari Desktop
- [ ] Test offline functionality in Safari
- [ ] Verify service worker support
- [ ] Check PWA installation capabilities

## 11. Mobile Testing

### iOS Safari
- [ ] Test on iOS device or simulator
- [ ] Verify PWA installation to home screen
- [ ] Test offline functionality
- [ ] Check photo capture from camera
- [ ] Verify touch interactions work properly

### Android Chrome
- [ ] Test on Android device
- [ ] Verify PWA installation works
- [ ] Test offline functionality
- [ ] Check camera integration
- [ ] Verify performance on mobile network

## 12. Edge Cases & Error Conditions

### Network Instability
- [ ] Start sync process
- [ ] Disconnect network during sync
- [ ] Reconnect and verify sync resumes
- [ ] Check that partial failures are handled gracefully

### Storage Quota
- [ ] Fill up IndexedDB storage (if possible)
- [ ] Verify graceful handling of storage errors
- [ ] Check that app remains functional

### Multiple Tabs
- [ ] Open multiple tabs with the app
- [ ] Perform actions in one tab while offline
- [ ] Switch to another tab
- [ ] Verify data consistency across tabs

## 13. Accessibility Testing

### Keyboard Navigation
- [ ] Verify all interactive elements are keyboard accessible
- [ ] Test tab order through workflow actions
- [ ] Confirm offline status is announced to screen readers

### Screen Reader Support
- [ ] Test with VoiceOver (iOS) or TalkBack (Android)
- [ ] Verify offline status announcements
- [ ] Check that sync status is communicated

## Success Criteria Summary

### All tests should pass for successful implementation:
- [ ] ✅ App passes Lighthouse PWA audit with 100% Installable score
- [ ] ✅ App installs successfully on Android and iOS home screens
- [ ] ✅ Jobs list loads from cache when offline
- [ ] ✅ Job details accessible offline
- [ ] ✅ Check-in/out works offline and queues properly
- [ ] ✅ Photo upload works offline and queues properly
- [ ] ✅ Notes can be added offline and queue properly
- [ ] ✅ Auto-sync works when connection returns
- [ ] ✅ Manual sync button functions correctly
- [ ] ✅ Visual feedback (badges, banners) works properly
- [ ] ✅ No data loss or corruption during sync
- [ ] ✅ Performance remains good with code-splitting
- [ ] ✅ Bundle sizes are optimized for mobile

## Bug Reporting Template

If any issues are found, please report using this template:

**Issue Title:**
**Environment:** (Browser, OS, Device)
**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**
**Actual Behavior:**
**Screenshots/Console Logs:**
**Additional Context:**

---

*Last updated: August 26, 2025*
*ServicePro PWA + Offline Implementation v1.0*