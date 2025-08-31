# YouTube SEO Optimizer

A production-ready Node.js application that extracts YouTube video transcripts and uses OpenAI to optimize content for better SEO performance.

## 🚀 Features

- **YouTube Transcript Extraction**: Automatically fetch video transcripts
- **AI-Powered SEO Optimization**: Uses OpenAI GPT-4 for intelligent content optimization
- **Video Metadata Fetching**: Get comprehensive video information
- **Bulk Processing**: Process multiple videos at once
- **Web Interface**: User-friendly web interface included
- **Rate Limiting**: Built-in protection against abuse
- **Security**: Helmet.js and CORS protection
- **Heroku Ready**: Pre-configured for Heroku deployment

## 📋 API Endpoints

### Core Endpoints
- `POST /api/optimize` - Full SEO optimization with transcript and metadata
- `POST /api/metadata` - Get video metadata only
- `POST /api/transcript` - Get video transcript only
- `POST /api/bulk-optimize` - Process multiple videos (max 10)
- `POST /api/trending-keywords` - Generate trending keywords for topics
- `GET /health` - Health check endpoint

### Web Interface
- `GET /` - Access the web interface for easy video optimization

## 🛠️ Installation & Setup

### 1. Clone and Install Dependencies
```bash
git clone <your-repo-url>
cd youtube-seo-optimizer
npm install
```

### 2. Environment Configuration
Copy the provided `.env` file or create your own with:
```env
OPENAI_API_KEY=your-openai-api-key
YOUTUBE_API_KEY=your-youtube-api-key
PORT=3000
NODE_ENV=production
```

### 3. Local Development
```bash
# Start in development mode
npm run dev

# Start in production mode
npm start
```

### 4. Heroku Deployment
```bash
# Login to Heroku
heroku login

# Create new app
heroku create your-app-name

# Set environment variables
heroku config:set OPENAI_API_KEY=your-key
heroku config:set YOUTUBE_API_KEY=your-key
heroku config:set NODE_ENV=production

# Deploy
git add .
git commit -m "Initial deployment"
git push heroku main
```

## 📝 Usage Examples

### Basic SEO Optimization
```javascript
const response = await fetch('/api/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        url: 'https://www.youtube.com/watch?v=VIDEO_ID',
        optimizationType: 'seo'
    })
});

const data = await response.json();
console.log(data.optimization);
```

### Bulk Processing
```javascript
const response = await fetch('/api/bulk-optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        urls: [
            'https://www.youtube.com/watch?v=VIDEO_ID_1',
            'https://www.youtube.com/watch?v=VIDEO_ID_2'
        ],
        optimizationType: 'seo'
    })
});
```

### Trending Keywords
```javascript
const response = await fetch('/api/trending-keywords', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        topic: 'artificial intelligence',
        category: 'technology'
    })
});
```

## 🔧 Configuration

### Optimization Types
- `seo`: Full SEO optimization with title, description, tags, and keywords
- `summary`: Video summary with key points and topics
- `hashtags`: Trending hashtag generation

### Rate Limiting
- 100 requests per 15 minutes per IP
- Configurable via environment variables

### Security Features
- Helmet.js for security headers
- CORS protection
- Request size limits (10MB)
- Input validation

## 📊 Response Format

### Successful Optimization Response
```json
{
    "success": true,
    "videoId": "VIDEO_ID",
    "metadata": {
        "title": "Video Title",
        "channelTitle": "Channel Name",
        "viewCount": "1000000",
        "publishedAt": "2023-01-01T00:00:00Z"
    },
    "transcript": {
        "text": "Full transcript...",
        "wordCount": 1500
    },
    "optimization": {
        "optimizedTitle": "SEO Optimized Title",
        "optimizedDescription": "SEO optimized description...",
        "tags": ["tag1", "tag2", "tag3"],
        "keywords": ["keyword1", "keyword2"],
        "chapters": ["0:00 Introduction", "2:30 Main Topic"]
    }
}
```

## 🚨 Error Handling

The API returns detailed error messages for:
- Invalid YouTube URLs
- Private or unavailable videos
- API rate limits exceeded
- Missing transcripts
- Authentication failures

## 🛡️ Security Considerations

1. **API Keys**: Never commit API keys to version control
2. **Environment Variables**: Use Heroku Config Vars for production
3. **CORS**: Update allowed origins for production domains
4. **Rate Limiting**: Adjust limits based on usage patterns
5. **Input Validation**: All inputs are validated and sanitized

## 📈 Performance

- Parallel processing of metadata and transcript fetching
- Efficient AI prompt engineering for consistent results
- Built-in caching recommendations for high-traffic scenarios
- Optimized for Heroku's ephemeral filesystem

## 🔄 Updates & Maintenance

- Monitor OpenAI API usage and costs
- Update YouTube API quotas as needed
- Regular dependency updates for security
- Scale Heroku dynos based on traffic

## 📞 Support

For issues or questions:
1. Check the error messages in the API responses
2. Verify API keys are correctly configured
3. Ensure video URLs are valid and public
4. Check Heroku logs for deployment issues

## 📄 License

MIT License - See LICENSE file for details
