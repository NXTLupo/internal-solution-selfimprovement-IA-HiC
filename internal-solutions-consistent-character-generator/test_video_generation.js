// Test script to generate a video and prove the API integration works
console.log('🎬 Starting video generation test...');

// Test API key availability
if (window.API_KEY) {
    console.log('✅ API Key found:', window.API_KEY.substring(0, 10) + '...');
} else {
    console.error('❌ API Key not found');
}

// Import Google GenAI
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: window.API_KEY });

async function testVideoGeneration() {
    try {
        console.log('🎬 Testing video generation with Veo 3...');

        // Simple test prompt
        const prompt = "Create a cinematic 8-second video of a peaceful forest scene with gentle wind moving through the trees and sunlight filtering through the leaves.";

        console.log('📝 Prompt:', prompt);

        // Use the corrected API call
        const response = await ai.models.generateContent({
            model: 'veo-3.0-generate-001',
            contents: {
                parts: [{ text: prompt }]
            }
        });

        console.log('📊 Response received:', response);

        // Check for operation ID in response
        const candidates = response.candidates;
        if (candidates && candidates.length > 0) {
            const textPart = candidates[0]?.content?.parts?.find(part => part.text);
            if (textPart?.text) {
                console.log('📄 Response text:', textPart.text);

                const operationMatch = textPart.text.match(/operations\/([a-zA-Z0-9-_]+)/);
                const operationId = operationMatch ? operationMatch[1] : null;

                if (operationId) {
                    console.log('🆔 Operation ID found:', operationId);
                    console.log('✅ VIDEO GENERATION STARTED SUCCESSFULLY!');

                    // Start polling
                    pollOperation(operationId);
                } else {
                    console.log('❌ No operation ID found in response');
                }
            }
        }

    } catch (error) {
        console.error('❌ Video generation error:', error);
    }
}

async function pollOperation(operationId) {
    console.log('🔄 Starting to poll operation:', operationId);

    const maxAttempts = 120; // 10 minutes
    let attempts = 0;

    const pollInterval = setInterval(async () => {
        attempts++;
        console.log(`🔄 Polling attempt ${attempts}/${maxAttempts}`);

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/operations/${operationId}?key=${window.API_KEY}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const operationData = await response.json();

            if (operationData.done) {
                clearInterval(pollInterval);

                if (operationData.error) {
                    console.error('❌ Video generation failed:', operationData.error);
                } else {
                    console.log('🎉 VIDEO GENERATION COMPLETED!');

                    // Extract video data
                    const candidates = operationData.response?.candidates;
                    if (candidates && candidates.length > 0) {
                        const videoData = candidates[0]?.content?.parts?.find(part => part.videoData);

                        if (videoData?.videoData) {
                            console.log('🎥 VIDEO DATA FOUND:');
                            console.log('   File URI:', videoData.videoData.fileUri);
                            console.log('   URL:', videoData.videoData.url);
                            console.log('   MIME Type:', videoData.videoData.mimeType);

                            // Display the video
                            if (videoData.videoData.url) {
                                displayVideo(videoData.videoData.url);
                            }
                        }
                    }
                }
            } else {
                console.log('⏳ Still generating...');
            }

        } catch (error) {
            console.error('❌ Polling error:', error);

            if (attempts >= maxAttempts) {
                clearInterval(pollInterval);
                console.log('⏰ Polling timeout');
            }
        }

        if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            console.log('⏰ Maximum attempts reached');
        }

    }, 5000); // Poll every 5 seconds
}

function displayVideo(videoUrl) {
    console.log('🎥 CREATING VIDEO ELEMENT WITH URL:', videoUrl);

    // Create video element
    const video = document.createElement('video');
    video.src = videoUrl;
    video.controls = true;
    video.autoplay = false;
    video.style.width = '100%';
    video.style.maxWidth = '800px';
    video.style.border = '2px solid #00ff00';
    video.style.margin = '20px 0';

    // Add to page
    const container = document.createElement('div');
    container.innerHTML = '<h2 style="color: green;">✅ VIDEO GENERATED SUCCESSFULLY!</h2>';
    container.appendChild(video);

    document.body.appendChild(container);

    console.log('✅ VIDEO ELEMENT ADDED TO PAGE!');
    console.log('🔗 VIDEO URL:', videoUrl);
}

// Start the test
testVideoGeneration();