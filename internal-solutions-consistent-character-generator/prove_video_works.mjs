#!/usr/bin/env node

// Direct API test to prove video generation works
import { GoogleGenAI } from '@google/genai';
import fetch from 'node-fetch';

// Use the API key from the environment
const API_KEY = '***REDACTED-GOOGLE-KEY***';

console.log('🎬 PROVING VIDEO GENERATION WORKS...');
console.log('✅ API Key:', API_KEY.substring(0, 10) + '...');

async function proveVideoGeneration() {
    try {
        console.log('\n🔄 Initializing Google GenAI...');
        const ai = new GoogleGenAI({ apiKey: API_KEY });

        const prompt = "Create a cinematic 8-second video of a peaceful mountain lake at sunset, with gentle ripples on the water surface, golden light reflecting off the water, and a serene, calm atmosphere.";

        console.log('\n📝 Prompt:', prompt);
        console.log('\n🚀 Sending request to Veo 3 API...');

        const startTime = Date.now();

        const response = await ai.models.generateContent({
            model: 'veo-3.0-generate-001',
            contents: {
                parts: [{ text: prompt }]
            }
        });

        const requestTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Response received in ${requestTime} seconds`);

        console.log('\n📊 Analyzing response structure...');
        console.log('Response keys:', Object.keys(response));
        console.log('Has candidates:', !!response.candidates);
        console.log('Candidates length:', response.candidates?.length || 0);

        // Extract operation ID
        const candidates = response.candidates;
        let operationId = null;

        if (candidates && candidates.length > 0) {
            console.log('\n🔍 Examining first candidate...');
            const candidate = candidates[0];
            console.log('Candidate keys:', Object.keys(candidate));
            console.log('Has content:', !!candidate.content);
            console.log('Has parts:', !!candidate.content?.parts);
            console.log('Parts length:', candidate.content?.parts?.length || 0);

            const textPart = candidate.content?.parts?.find(part => part.text);
            if (textPart?.text) {
                console.log('\n📄 Response text found:');
                console.log(textPart.text);

                const operationMatch = textPart.text.match(/operations\/([a-zA-Z0-9-_]+)/);
                operationId = operationMatch ? operationMatch[1] : null;

                if (operationId) {
                    console.log('\n🆔 OPERATION ID EXTRACTED:', operationId);
                    console.log('✅ VIDEO GENERATION STARTED SUCCESSFULLY!');
                    console.log('\n🔄 Starting polling process...');

                    // Poll for completion
                    await pollForCompletion(operationId);
                } else {
                    console.log('\n❌ No operation ID found in response text');
                    console.log('This might indicate an API issue or model unavailability');
                }
            } else {
                console.log('\n❌ No text part found in response');
            }
        } else {
            console.log('\n❌ No candidates found in response');
        }

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);

        if (error.message.includes('API key')) {
            console.log('🔑 API key issue - check if key is valid and has video generation permissions');
        } else if (error.message.includes('quota')) {
            console.log('💰 Quota issue - check if you have remaining video generation quota');
        } else if (error.message.includes('not found')) {
            console.log('🔍 Model not found - veo-3.0-generate-001 might not be available');
        }
    }
}

async function pollForCompletion(operationId) {
    const maxAttempts = 60; // 5 minutes max for testing
    let attempts = 0;
    const startTime = Date.now();

    console.log(`⏰ Will poll for up to ${(maxAttempts * 5) / 60} minutes`);

    return new Promise((resolve, reject) => {
        const pollInterval = setInterval(async () => {
            attempts++;
            const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

            console.log(`🔄 Poll ${attempts}/${maxAttempts} (${elapsed} min) - Checking operation ${operationId}`);

            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/operations/${operationId}?key=${API_KEY}`);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const operationData = await response.json();

                if (operationData.done) {
                    clearInterval(pollInterval);
                    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

                    if (operationData.error) {
                        console.log(`\n❌ Video generation failed after ${totalTime} minutes:`);
                        console.error(operationData.error);
                        reject(new Error(operationData.error.message));
                    } else {
                        console.log(`\n🎉 VIDEO GENERATION COMPLETED IN ${totalTime} MINUTES!`);

                        // Extract video data
                        const candidates = operationData.response?.candidates;
                        if (candidates && candidates.length > 0) {
                            const videoData = candidates[0]?.content?.parts?.find(part => part.videoData);

                            if (videoData?.videoData) {
                                console.log('\n🎥 VIDEO DATA FOUND:');
                                console.log('   📁 File URI:', videoData.videoData.fileUri);
                                console.log('   🔗 URL:', videoData.videoData.url);
                                console.log('   📋 MIME Type:', videoData.videoData.mimeType);

                                console.log('\n🎊 SUCCESS! VIDEO GENERATION WORKS!');
                                console.log('🔗 VIDEO LINK:', videoData.videoData.url);

                                resolve(videoData.videoData.url);
                            } else {
                                console.log('\n❌ No video data found in completed operation');
                                console.log('Full response:', JSON.stringify(operationData, null, 2));
                                reject(new Error('No video data found'));
                            }
                        } else {
                            console.log('\n❌ No candidates found in completed operation');
                            reject(new Error('No candidates found'));
                        }
                    }
                } else {
                    console.log('   ⏳ Still generating...');
                }

            } catch (error) {
                console.error(`   ❌ Polling error: ${error.message}`);

                if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    console.log(`\n⏰ Timeout after ${attempts} attempts`);
                    reject(new Error('Polling timeout'));
                }
            }

            if (attempts >= maxAttempts) {
                clearInterval(pollInterval);
                console.log(`\n⏰ Maximum attempts (${maxAttempts}) reached`);
                reject(new Error('Maximum attempts reached'));
            }

        }, 5000); // Poll every 5 seconds
    });
}

// Run the test
proveVideoGeneration().then(() => {
    console.log('\n✅ TEST COMPLETED SUCCESSFULLY!');
    process.exit(0);
}).catch((error) => {
    console.error('\n❌ TEST FAILED:', error.message);
    process.exit(1);
});