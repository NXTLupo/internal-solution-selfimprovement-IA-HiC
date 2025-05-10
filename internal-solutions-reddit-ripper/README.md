# NXT Humans Reddit Data Collector

A web application that retrieves posts and comments from Reddit subreddits and exports them to PDF format for analysis.

## Features

- **Subreddit Scraping**: Collect top posts from any public subreddit
- **Flexible Time Filtering**: Choose from day, week, month, year, or all time periods
- **Customizable Collection**: Control the number of posts and comments to retrieve
- **Automatic PDF Generation**: Export data in structured PDF format
- **Progress Tracking**: Real-time progress monitoring during collection
- **Batch Processing**: Large collections are split into manageable PDF files

## Getting Started

### Prerequisites

- Python 3.9+
- Flask
- PRAW (Python Reddit API Wrapper)
- FPDF

### Installation

1. Clone this repository:
```bash
git clone https://github.com/NXT-Humans/internal-solutions-reddit-ripper
cd internal-solutions-reddit-ripper
```

2. Install required dependencies:
```bash
pip install flask praw fpdf
```

### Running the Application

Start the application:
```bash
python app.py
```

The application will be available at http://localhost:5000

## Usage

1. Enter a subreddit name (without the "r/" prefix)
2. Specify how many posts to collect (recommended maximum: 1000)
3. Select the time filter (past day, week, month, year, or all time)
4. Choose how many comments to include for each post
5. Click "Start Collection" and wait for the process to complete
6. Download the generated PDF files

## API Endpoints

- `POST /api/scrape`: Start a new collection job
  - Parameters:
    - `subreddit`: Name of the subreddit (without "r/")
    - `post_count`: Number of posts to retrieve
    - `time_filter`: Time period (day, week, month, year, all)
    - `comments_per_post`: Number of comments to include per post
  - Returns: `job_id` for tracking the collection

- `GET /api/status/<job_id>`: Check collection status
  - Returns: Job status, progress, and available files

- `GET /api/download/<job_id>/<filename>`: Download a generated PDF file

## Note on Rate Limits

Reddit's API has rate limits. For large collections, the process may take several minutes to complete.

## License

MIT