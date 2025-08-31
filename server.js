const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const { YoutubeTranscript } = require('youtube-transcript');
const { google } = require('googleapis');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Initialize YouTube API
const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY
});

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-frontend-domain.com'] 
        : ['http://localhost:3000', 'http://127.0.0.1:3000']
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Serve static files
app.use(express.static('public'));

// Helper function to extract video ID from YouTube URL
function extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// Helper function to get video metadata
async function getVideoMetadata(videoId) {
    try {
        const response = await youtube.videos.list({
            part: ['snippet', 'statistics', 'contentDetails'],
            id: [videoId]
        });

        if (response.data.items.length === 0) {
            throw new Error('Video not found');
        }

        const video = response.data.items[0];
        return {
            title: video.snippet.title,
            description: video.snippet.description,
            channelTitle: video.snippet.channelTitle,
            publishedAt: video.snippet.publishedAt,
            tags: video.snippet.tags || [],
            categoryId: video.snippet.categoryId,
            viewCount: video.statistics.viewCount,
            likeCount: video.statistics.likeCount,
            commentCount: video.statistics.commentCount,
            duration: video.contentDetails.duration,
            thumbnails: video.snippet.thumbnails
        };
    } catch (error) {
        console.error('Error fetching video metadata:', error);
        throw error;
    }
}

// Helper function to get transcript
async function getTranscript(videoId) {
    try {
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);
        return transcript.map(entry => entry.text).join(' ');
    } catch (error) {
        console.error('Error fetching transcript:', error);
        throw new Error('Could not fetch transcript. Video may not have captions or may be private.');
    }
}

// Helper function to optimize content with OpenAI
async function optimizeWithAI(content, metadata, optimizationType = 'seo') {
    try {
        let prompt = '';

        switch (optimizationType) {
            case 'seo':
                prompt = `As a YouTube SEO expert, analyze and optimize the following video content:

Title: ${metadata.title}
Description: ${metadata.description}
Transcript: ${content.substring(0, 3000)}...

Provide SEO optimization suggestions including:
1. Improved title (60 characters max)
2. Optimized description (125 words)
3. 10-15 relevant tags
4. 5 key timestamps for chapters
5. Trending keywords to target
6. Suggested thumbnail text

Format your response as JSON with these keys: optimizedTitle, optimizedDescription, tags, chapters, keywords, thumbnailText`;
                break;

            case 'summary':
                prompt = `Create a comprehensive summary of this YouTube video:

Title: ${metadata.title}
Transcript: ${content}

Provide:
1. Executive summary (2-3 sentences)
2. Key points (5-7 bullet points)
3. Main topics covered
4. Target audience
5. Call to action suggestions

Format as JSON with keys: executiveSummary, keyPoints, topics, targetAudience, callToAction`;
                break;

            case 'hashtags':
                prompt = `Generate trending hashtags for this YouTube video:

Title: ${metadata.title}
Content: ${content.substring(0, 2000)}...

Provide 20 relevant hashtags categorized as:
- Primary (5): Most relevant to content
- Secondary (10): Niche-specific 
- Trending (5): Popular but relevant

Format as JSON with keys: primary, secondary, trending`;
                break;
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You are a YouTube SEO expert. Always respond with valid JSON format."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 1500,
            temperature: 0.7
        });

        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        console.error('Error with AI optimization:', error);
        throw error;
    }
}

// Routes

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Get video metadata only
app.post('/api/metadata', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'YouTube URL is required' });
        }

        const videoId = extractVideoId(url);
        if (!videoId) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        const metadata = await getVideoMetadata(videoId);

        res.json({
            success: true,
            videoId,
            metadata
        });

    } catch (error) {
        console.error('Error in /api/metadata:', error);
        res.status(500).json({ 
            error: 'Failed to fetch video metadata',
            details: error.message 
        });
    }
});

// Get transcript only
app.post('/api/transcript', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'YouTube URL is required' });
        }

        const videoId = extractVideoId(url);
        if (!videoId) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        const transcript = await getTranscript(videoId);

        res.json({
            success: true,
            videoId,
            transcript,
            wordCount: transcript.split(' ').length
        });

    } catch (error) {
        console.error('Error in /api/transcript:', error);
        res.status(500).json({ 
            error: 'Failed to fetch transcript',
            details: error.message 
        });
    }
});

// Full SEO optimization
app.post('/api/optimize', async (req, res) => {
    try {
        const { url, optimizationType = 'seo' } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'YouTube URL is required' });
        }

        const videoId = extractVideoId(url);
        if (!videoId) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        // Get video metadata and transcript in parallel
        const [metadata, transcript] = await Promise.all([
            getVideoMetadata(videoId),
            getTranscript(videoId)
        ]);

        // Get AI optimization
        const optimization = await optimizeWithAI(transcript, metadata, optimizationType);

        res.json({
            success: true,
            videoId,
            metadata,
            transcript: {
                text: transcript,
                wordCount: transcript.split(' ').length
            },
            optimization
        });

    } catch (error) {
        console.error('Error in /api/optimize:', error);
        res.status(500).json({ 
            error: 'Failed to optimize video',
            details: error.message 
        });
    }
});

// Bulk optimization for multiple videos
app.post('/api/bulk-optimize', async (req, res) => {
    try {
        const { urls, optimizationType = 'seo' } = req.body;

        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            return res.status(400).json({ error: 'Array of YouTube URLs is required' });
        }

        if (urls.length > 10) {
            return res.status(400).json({ error: 'Maximum 10 URLs allowed per request' });
        }

        const results = [];

        for (const url of urls) {
            try {
                const videoId = extractVideoId(url);
                if (!videoId) {
                    results.push({ url, error: 'Invalid YouTube URL' });
                    continue;
                }

                const [metadata, transcript] = await Promise.all([
                    getVideoMetadata(videoId),
                    getTranscript(videoId)
                ]);

                const optimization = await optimizeWithAI(transcript, metadata, optimizationType);

                results.push({
                    url,
                    success: true,
                    videoId,
                    metadata: {
                        title: metadata.title,
                        viewCount: metadata.viewCount,
                        publishedAt: metadata.publishedAt
                    },
                    optimization
                });

                // Add delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                results.push({ 
                    url, 
                    error: error.message 
                });
            }
        }

        res.json({
            success: true,
            results,
            processed: results.length,
            successful: results.filter(r => r.success).length
        });

    } catch (error) {
        console.error('Error in /api/bulk-optimize:', error);
        res.status(500).json({ 
            error: 'Failed to process bulk optimization',
            details: error.message 
        });
    }
});

// Get trending keywords for a topic
app.post('/api/trending-keywords', async (req, res) => {
    try {
        const { topic, category = 'general' } = req.body;

        if (!topic) {
            return res.status(400).json({ error: 'Topic is required' });
        }

        const prompt = `Generate 20 trending YouTube keywords for the topic: "${topic}" in the ${category} category.

Provide keywords that are:
1. Currently trending on YouTube
2. Have good search volume
3. Are relevant to the topic
4. Include both short-tail and long-tail keywords

Format as JSON with keys: shortTail (10 keywords), longTail (10 keywords)`;

        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You are a YouTube SEO expert specializing in trending keywords. Always respond with valid JSON."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 800,
            temperature: 0.8
        });

        const keywords = JSON.parse(response.choices[0].message.content);

        res.json({
            success: true,
            topic,
            category,
            keywords
        });

    } catch (error) {
        console.error('Error in /api/trending-keywords:', error);
        res.status(500).json({ 
            error: 'Failed to generate trending keywords',
            details: error.message 
        });
    }
});

// Serve main HTML page
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>YouTube SEO Optimizer</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .container { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
            input[type="url"], select { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; }
            button { background: #ff0000; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; }
            button:hover { background: #cc0000; }
            .result { background: white; padding: 15px; margin: 10px 0; border-radius: 4px; border-left: 4px solid #ff0000; }
            .error { border-left-color: #f44336; }
            .loading { text-align: center; color: #666; }
        </style>
    </head>
    <body>
        <h1>🎯 YouTube SEO Optimizer</h1>
        <div class="container">
            <h3>Optimize Your YouTube Content</h3>
            <input type="url" id="videoUrl" placeholder="Enter YouTube video URL..." />
            <select id="optimizationType">
                <option value="seo">SEO Optimization</option>
                <option value="summary">Video Summary</option>
                <option value="hashtags">Hashtag Generation</option>
            </select>
            <button onclick="optimizeVideo()">🚀 Optimize Video</button>
            <div id="result"></div>
        </div>

        <script>
            async function optimizeVideo() {
                const url = document.getElementById('videoUrl').value;
                const type = document.getElementById('optimizationType').value;
                const resultDiv = document.getElementById('result');

                if (!url) {
                    alert('Please enter a YouTube URL');
                    return;
                }

                resultDiv.innerHTML = '<div class="loading">🔄 Processing video...</div>';

                try {
                    const response = await fetch('/api/optimize', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url, optimizationType: type })
                    });

                    const data = await response.json();

                    if (data.success) {
                        resultDiv.innerHTML = \`
                        <div class="result">
                            <h4>✅ Optimization Complete</h4>
                            <p><strong>Title:</strong> \${data.metadata.title}</p>
                            <p><strong>Channel:</strong> \${data.metadata.channelTitle}</p>
                            <p><strong>Views:</strong> \${Number(data.metadata.viewCount).toLocaleString()}</p>
                            <pre>\${JSON.stringify(data.optimization, null, 2)}</pre>
                        </div>\`;
                    } else {
                        throw new Error(data.error || 'Unknown error');
                    }
                } catch (error) {
                    resultDiv.innerHTML = \`<div class="result error">❌ Error: \${error.message}</div>\`;
                }
            }
        </script>
    </body>
    </html>
    `);
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 YouTube SEO Optimizer running on port ${PORT}`);
    console.log(`📱 Access the web interface at: http://localhost:${PORT}`);
    console.log(`🔧 API endpoints available at: http://localhost:${PORT}/api/`);
});

module.exports = app;
