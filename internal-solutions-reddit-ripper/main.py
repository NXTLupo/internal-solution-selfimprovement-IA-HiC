import os
try:
    import praw
except:
    !pip install praw
    import praw

try:
    from fpdf import FPDF
except:
    !pip install fpdf
    from fpdf import FPDF

from datetime import datetime
import re


def clean_text(text):
    # Replace common smart characters or remove unsupported ones
    replacements = {
        "\u2018": "'", "\u2019": "'", "\u201c": '"', "\u201d": '"', "\u2026": "..."
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    # Remove any other non-ASCII characters
    text = re.sub(r'[^\x00-\x7F]+', '', text)
    return text

# Function to format the timestamp
def seconds_to_datetime(seconds):
    return datetime.fromtimestamp(int(seconds)).strftime('%Y-%m-%d %H:%M:%S')

# Initialize the Reddit instance with praw
user_agent_string = os.environ.get("REDDIT_USER_AGENT", "script:nxt-humans:1.0")
reddit = praw.Reddit(
    client_id=os.environ.get("REDDIT_CLIENT_ID", ""),
    client_secret=os.environ.get("REDDIT_CLIENT_SECRET", ""),
    user_agent=user_agent_string,
    check_for_async=False,
    ratelimit_seconds=10
)

# Function to generate a PDF
def generate_pdf(pdf, posts_count):
    filename = f"reddit_posts_and_comments_{posts_count}.pdf"
    pdf.output(filename)
    print(f"Saved {filename}")

# Initialize counters and pdf
posts_count = 0
batch_size = 100

# Create a PDF instance for each batch
pdf = FPDF()
pdf.add_page()
pdf.set_font("Arial", size=9)


# Usage Notes:
#
# These two parameters are set on the line beginning with "topSubmissions" below.
#
# Parameters:
#   1. Subreddit name parameter:
#         Enter the subreddit name you want to crawl in doublequotes below (case-sensitive).
#         E.g.: Instead of "NEU", enter "artificial" to crawl the "aritificial" subreddit
#         at https://www.reddit.com/r/artificial/. The subreddit parameter value should 
#         exactly match the subreddit name from its Reddit URL.
#   2. Post count parameter:
#         Enter the total number of posts to retrieve from the subreddit by changing
#         the number after "limit=". E.g.: Instead of the placeholder of 250, update it
#         500 to get 500 posts.
#

topSubmissions = reddit.subreddit("NEU").top(limit=250, time_filter="year")



# Write the posts and comments to multiple PDFs
for submission in topSubmissions:
    # Write the post details
    post_title = f"Post Title: {clean_text(submission.title)}\n"
    self_text = f"Post Body: {clean_text(submission.selftext)}\n"
    score = f"Score: {submission.score}\n"
    comments_count = f"Number of Comments: {submission.num_comments}\n"
    post_created = f"Posted on: {seconds_to_datetime(submission.created)}\n\n"
    comments_intro = "Comments (Best):\n"

    # Add post details to the PDF
    pdf.multi_cell(0, 10, clean_text(post_title))
    pdf.multi_cell(0, 10, clean_text(self_text))
    pdf.multi_cell(0, 10, score)
    pdf.multi_cell(0, 10, comments_count)
    pdf.multi_cell(0, 10, post_created)
    pdf.multi_cell(0, 10, comments_intro)

    # Write the comments
    submission.comment_sort = "top"
    submission.comments.replace_more(limit=0)
    all_comments = submission.comments.list()
    first_ten_comments = all_comments[:5]
    for comment in first_ten_comments:
        if hasattr(comment, 'author'):
            author = comment.author
            body = comment.body
            body = clean_text(body)
            comment_body = f"Comment by {author}: {body}\n"
            pdf.multi_cell(0, 10, comment_body)

    # Add a separator between posts
    pdf.multi_cell(0, 10, "\n- - - - - - - - - - - - - - - - - - - - - - - - - - - - -\n\n")

    # Increment the post counter
    posts_count += 1

    # If 500 posts have been processed, save the current PDF and start a new one
    if posts_count % batch_size == 0:
        generate_pdf(pdf, posts_count)
        pdf = FPDF()  # Create a new PDF instance for the next batch
        pdf.add_page()
        pdf.set_font("Arial", size=9)

# After loop ends, if there are remaining posts, save the final PDF
if posts_count % batch_size != 0:
    generate_pdf(pdf, posts_count)