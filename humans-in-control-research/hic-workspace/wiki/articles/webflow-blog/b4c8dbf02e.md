---
id: articles/webflow-blog/b4c8dbf02e.md
url: "https://webflowmarketingmain.com/blog/cloudinary-video-transcoding-webflow-cloud"
url_hash: "b4c8dbf02e"
kind: "article"
source: "webflow_blog"
title: "How to configure Cloudinary video transcoding on Webflow Cloud"
author: ""
date: "Sat, 08 Aug 2026 00:00:00 GMT"
tier: 3
method: "source-native"
extracted_at: "2026-10-09T16:53:36.226793+00:00"
chars: 10000
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
collected_at: "2026-10-09T16:53:36.871Z"
relevance: 5
engagement_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
content_hash: "9487af96eed3fd3f"
relevance_by_goal: {"aa6916010743":5}
chunks:
  - id: "articles/webflow-blog/b4c8dbf02e.md#c0"
    char_span: [0, 170]
    sentence_count: 1
    key_terms: [cloudinary-video-transcoding-webflow-cloud, webflowmarketingmain, transcoding, cloudinary, configure, webflow, source, cloud]
    token_count: 38
    sources: [{"n":"webflow_blog","u":"https://webflowmarketingmain.com/blog/cloudinary-video-transcoding-webflow-cloud","kind":"article","date":"2026-08-08"}]
  - id: "articles/webflow-blog/b4c8dbf02e.md#c1"
    char_span: [172, 2837]
    sentence_count: 17
    key_terms: [cloudinary, webflow, transcoding, video, upload, cloud, delivery, preset]
    concepts: [cloudinary, transcoding, webflow, video, upload]
    related_chunks: ["articles/webflow-blog/b4c8dbf02e.md#c2"]
    token_count: 512
    sources: [{"n":"webflow_blog","u":"https://webflowmarketingmain.com/blog/cloudinary-video-transcoding-webflow-cloud","kind":"article","date":"2026-08-08"}]
  - id: "articles/webflow-blog/b4c8dbf02e.md#c2"
    char_span: [2447, 4937]
    sentence_count: 16
    key_terms: [preset, upload, cloudinary, webflow-cloud-videos, eager, variables, add, generate]
    concepts: [preset, upload, cloudinary, webflow-cloud-videos, variables]
    related_chunks: ["articles/webflow-blog/b4c8dbf02e.md#c1"]
    token_count: 512
    sources: [{"n":"webflow_blog","u":"https://webflowmarketingmain.com/blog/cloudinary-video-transcoding-webflow-cloud","kind":"article","date":"2026-08-08"}]
  - id: "articles/webflow-blog/b4c8dbf02e.md#c3"
    char_span: [4694, 6782]
    sentence_count: 8
    key_terms: [options, transforms, cloudinary, streamingprofile, push, videotransformoptions, url, cloudinary-video]
    concepts: [options, transforms, streamingprofile, cloudinary, videotransformoptions]
    related_chunks: ["articles/webflow-blog/b4c8dbf02e.md#c4"]
    token_count: 512
    sources: [{"n":"webflow_blog","u":"https://webflowmarketingmain.com/blog/cloudinary-video-transcoding-webflow-cloud","kind":"article","date":"2026-08-08"}]
  - id: "articles/webflow-blog/b4c8dbf02e.md#c4"
    char_span: [6543, 8721]
    sentence_count: 10
    key_terms: [webflow-cloud-videos, streamingprofile, product-demo, video, options, auto, mp4, codec]
    concepts: [webflow-cloud-videos, streamingprofile, product-demo, options, video]
    related_chunks: ["articles/webflow-blog/b4c8dbf02e.md#c3"]
    token_count: 512
    sources: [{"n":"webflow_blog","u":"https://webflowmarketingmain.com/blog/cloudinary-video-transcoding-webflow-cloud","kind":"article","date":"2026-08-08"}]
  - id: "articles/webflow-blog/b4c8dbf02e.md#c5"
    char_span: [8464, 10172]
    sentence_count: 6
    key_terms: [upload, string, file, route, request, const, video, api]
    concepts: [upload, string, route, request, const]
    token_count: 396
    sources: [{"n":"webflow_blog","u":"https://webflowmarketingmain.com/blog/cloudinary-video-transcoding-webflow-cloud","kind":"article","date":"2026-08-08"}]
---
# How to configure Cloudinary video transcoding on Webflow Cloud

Source: [webflow_blog](https://webflowmarketingmain.com/blog/cloudinary-video-transcoding-webflow-cloud)

Webflow Cloud and Cloudinary pair up cleanly for adaptive video once you route uploads through REST instead of the Node SDK.
Wiring Cloudinary into a Webflow Cloud app for video delivery surfaces two failures that local development never triggers. The Node.js SDK imports modules that crash on the Cloudflare Workers runtime, and requesting an HLS URL before Cloudinary finishes eager transcoding returns a 423 to the first viewer.
Both problems have clean solutions. Cloudinary's entire upload and delivery pipeline is accessible via its REST API and CDN, with no SDK required. Eager transformations solve the 423 problem by pre-generating the transcoded versions at upload time, so the first real viewer always receives a CDN-cached result rather than triggering on-demand processing.
The combination of fetch-based uploads, upload preset configuration, and transformation URLs is what makes this work correctly on Webflow Cloud's edge runtime.
In this guide, we explore how to configure a Cloudinary upload preset with eager transcoding, add a video upload Route Handler using plain fetch, build a URL utility to generate optimized delivery URLs, and wire up HLS adaptive bitrate streaming with Cloudinary's sp_auto streaming profile.
What do you need to set up Cloudinary video transcoding on Webflow Cloud?
You need a Webflow Cloud Next.js app, a Cloudinary account with a video upload preset configured, and three environment variables. No additional npm packages are required beyond your existing Next.js project.
Cloudinary video transcoding runs entirely through their REST API and CDN, which means the full pipeline runs cleanly on Webflow Cloud's edge runtime without compatibility workarounds.
Confirm you have Node.js 22.13.0 or higher locally with node --version before starting. If you are adding video to a larger app alongside authentication, a database, and payments, our guide on building a full-stack app on Webflow Cloud with Supabase, Auth0, and Stripe shows how to layer multiple services in the same project.
6 steps to set up Cloudinary video transcoding on Webflow Cloud
The setup is divided into three pieces:
- A URL utility that constructs optimized Cloudinary delivery URLs
- A Route Handler that uploads videos to Cloudinary using plain fetch
- The HLS player configuration that handles adaptive streaming across all major browsers. The upload preset's eager transforms are what make the Route Handler simple. Instead of generating and passing transcoding parameters on every request, the preset applies them automatically, and Cloudinary handles the rest asynchronously.
Here is the full setup from environment variables to the first HLS delivery.
1. Create a Cloudinary account and configure a video upload preset
Log in to Cloudinary and navigate to Settings, then Upload, then Upload presets. Click Add upload preset. Set the preset name to webflow_video and the Signing mode to Unsigned. In the preset's transformation settings, add the following eager transformation string:
- sp_auto,f_m3u8|vc_auto,f_mp4
The pipe character separates two independent eager outputs:
(1) The first, sp_auto,f_m3u8, tells Cloudinary to generate an HLS master playlist and all required segment files using the automatic streaming profile.
(2) The second, vc_auto,f_mp4, generates a web-normalized MP4 as a fallback format. Enable asynchronous processing for eager transforms so the upload response returns immediately.
If you also set a default folder in the preset, such as webflow-cloud-videos, uploads using this preset will be organized into that subfolder in the Media Library. This matters for delivery URLs: your public IDs will include the folder path, for example, webflow-cloud-videos/my-video, when you construct URLs in the steps below.
Choose a consistent folder naming pattern and keep it in mind throughout the guide.
Before saving the preset, confirm two things:
(1) The Signing mode must be set to Unsigned. A Signed preset requires a timestamp and HMAC signature in every upload request, which the Route Handler in Step 4 does not generate and should not generate for this use case.
(2) Confirm the preset is in an active state. Inactive presets return a 400 error indistinguishable from a missing preset, and I have seen this cause unnecessary debugging time on first deployments when the preset was accidentally toggled off during configuration.
2. Add Cloudinary credentials to Webflow Cloud environment variables
With the upload preset created, add the three variables to .env.local at the root of your Next.js project:
# .env.local
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_VIDEO_UPLOAD_PRESET=webflow_video
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
Confirm .env.local is listed in .gitignore before continuing. Then, for production, open the Webflow Cloud dashboard, navigate to your project's Settings, select Environment Variables, and add each value. The cloud name and preset name do not need to be marked as secrets.
3. Create a Cloudinary video URL utility
Cloudinary applies transformations at the URL level. You construct a URL with the transformation parameters embedded in the path, Cloudinary generates the transformed video on the first request, and every subsequent request for that same URL is served directly from CDN cache.
Your Webflow Cloud app never proxies video bytes. It generates URLs, and Cloudinary handles delivery and caching entirely.
Create lib/cloudinary-video.ts in your project:
// lib/cloudinary-video.ts
type VideoTransformOptions = {
  codec?: 'auto' | 'h264' | 'h265' | 'vp9' | 'av1'
  quality?: 'auto' | number
  width?: number
  height?: number
  streamingProfile?: 'auto' | 'hd' | 'full_hd' | 'sd'
  format?: 'mp4' | 'webm' | 'm3u8' | 'mpd'
}
export function cloudinaryVideoUrl(
  publicId: string,
  options: VideoTransformOptions = {}
): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!
  const transforms: string[] = []
  if (options.streamingProfile) {
   // sp_auto selects representations automatically up to 1080p by default.
    // Named profiles like 'hd' or 'full_hd' use a predefined representation set.
    transforms.push(`sp_${options.streamingProfile}`)
  } else {
    if (options.codec) transforms.push(`vc_${options.codec}`)
    if (options.quality) transforms.push(`q_${options.quality}`)
  }
  if (options.width) transforms.push(`w_${options.width}`)
  if (options.height) transforms.push(`h_${options.height}`)
  const transformStr = transforms.length > 0 ? transforms.join(',') + '/' : ''
  // HLS uses .m3u8; MPEG-DASH uses .mpd; standard delivery defaults to .mp4
  const ext = options.format ?? (options.streamingProfile ? 'm3u8' : 'mp4')
  return `https://res.cloudinary.com/${cloudName}/video/upload/${transformStr}${publicId}.${ext}`
}
The streamingProfile option handles the two most important delivery patterns. Passing streamingProfile: 'auto' generates an HLS URL using sp_auto, which creates a ladder of representations up to 1080p by default (the exact count depends on the source video's resolution) and switches between them in real time as the viewer's bandwidth changes.
Named profiles like 'hd' or 'full_hd' use a predefined set of representations tuned to those quality tiers, with H.264, H.265, VP9, and AV1 codec variants available for each.
Delivering an optimized MP4 fallback
For direct MP4 delivery without adaptive streaming, passing codec: 'auto' applies the vc_auto transformation. This normalizes the video for web delivery by selecting the most appropriate codec for the requesting browser, typically H.264, H.265, or VP9, and optimizes encoding settings without requiring you to specify codec profiles or levels manually.
Adding quality: 'auto' adjusts compression per video based on content, often reducing file size by more than half with no visible quality difference.
Here are both patterns in use:
// HLS adaptive streaming: up to 1080p by default, bandwidth-adaptive
const hlsUrl = cloudinaryVideoUrl('webflow-cloud-videos/product-demo', {
  streamingProfile: 'auto',
})
// → https://res.cloudinary.com/your-cloud/video/upload/sp_auto/webflow-cloud-videos/product-demo.m3u8
// Optimized MP4 for direct playback or browsers without native HLS support
const mp4Url = cloudinaryVideoUrl('webflow-cloud-videos/product-demo', {
  codec: 'auto',
  quality: 'auto',
})
// → https://res.cloudinary.com/your-cloud/video/upload/vc_auto,q_auto/webflow-cloud-videos/product-demo.mp4
These two URLs are what you pass to your video player. The HLS URL delivers adaptive streaming. The MP4 URL serves as a fallback for browsers without native HLS support.
4. Build a video upload Route Handler
The upload Route Handler accepts a video file from a client form, passes it to Cloudinary's REST API via fetch, and returns the public ID and delivery URLs.
Because eager transformations are configured in the upload preset rather than generated dynamically in the request, the Route Handler remains straightforward: upload the file, capture the public ID and return the delivery URLs.
Create app/api/video-upload/route.ts:
// app/api/video-upload/route.ts
export const runtime = 'edge'
import { NextRequest, NextResponse } from 'next/server'
// Videos larger than 100 MB exceed the Workers runtime request body limit.
// For large files, upload directly from the browser to Cloudinary's upload API
// using NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and the same unsigned upload preset.
const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100 MB
type CloudinaryVideoUploadResult = {
  public_id: string
  secure_url: string
  playback_url: string
  format: string
  duration: number
  width: number
  height: number
  eager?: Array<{ secure_url: string; transformation: string }>
  error?: { message: string }
}
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if
