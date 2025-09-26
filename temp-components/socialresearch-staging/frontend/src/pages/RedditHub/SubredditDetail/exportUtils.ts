import jsPDF from 'jspdf';
import { DatabasePost, DatabaseComment } from '../../../types/reddit';
import { PostFilterData } from './PostFilter';

export interface ExportData {
  sortedPosts: DatabasePost[];
  subredditDetail: {
    subreddit: string;
    posts: DatabasePost[];
    totalPosts: number;
    totalComments: number;
  };
  filterData: PostFilterData;
}

// Helper function to recursively count all comments including nested replies
const getTotalCommentCount = (post: DatabasePost): number => {
  if (!post.comments || !Array.isArray(post.comments)) {
    return post.num_comments || 0; // Fallback to the original count if no detailed comments
  }

  let totalCount = 0;

  const countReplies = (comment: DatabaseComment): number => {
    let count = 1; // Count the comment itself
    
    if (comment.replies && Array.isArray(comment.replies)) {
      comment.replies.forEach((reply: DatabaseComment) => {
        count += countReplies(reply); // Recursively count replies
      });
    }
    
    return count;
  };

  // Count all top-level comments and their nested replies
  post.comments.forEach((comment: DatabaseComment) => {
    totalCount += countReplies(comment);
  });

  return totalCount;
};

// Helper function to format comments for export
const formatCommentsForExport = (comments: DatabaseComment[], indent: string = ''): string => {
  if (!comments || comments.length === 0) return '';
  
  let formattedComments = '';
  
  comments.forEach((comment, index) => {
    formattedComments += `${indent}${index + 1}. Author: ${comment.author || 'Unknown'}\n`;
    formattedComments += `${indent}   Score: ${comment.score || 0}\n`;
    formattedComments += `${indent}   Content: ${comment.body || 'No content'}\n`;
    
    if (comment.replies && comment.replies.length > 0) {
      formattedComments += `${indent}   Replies:\n`;
      formattedComments += formatCommentsForExport(comment.replies, indent + '   ');
    }
    
    formattedComments += '\n';
  });
  
  return formattedComments;
};

// Export posts as plain text
export const exportPostsAsText = ({ sortedPosts, subredditDetail, filterData }: ExportData) => {
  let content = `REDDIT POSTS EXPORT - r/${subredditDetail.subreddit}\n`;
  content += `${'='.repeat(60)}\n`;
  content += `Export Date: ${new Date().toLocaleString()}\n`;
  content += `Total Posts: ${sortedPosts.length}\n`;
  content += `Filter Settings:\n`;
  content += `  Search Term: ${filterData.searchTerm || 'None'}\n`;
  content += `  Sort By: ${filterData.sortBy}\n`;
  content += `  Upvotes Range: ${filterData.minUpvotes} - ${filterData.maxUpvotes}\n`;
  content += `  Comments Range: ${filterData.minComments} - ${filterData.maxComments}\n`;
  content += `${'='.repeat(60)}\n\n`;

  sortedPosts.forEach((post, index) => {
    content += `POST ${index + 1}\n`;
    content += `${'─'.repeat(40)}\n`;
    content += `Title: ${post.title}\n`;
    content += `Author: ${post.author || 'Unknown'}\n`;
    content += `Score: ${post.score || 0}\n`;
    content += `Comments: ${getTotalCommentCount(post)}\n`;
    content += `URL: ${post.url || 'N/A'}\n`;
    content += `Created: ${post.created_utc ? new Date(post.created_utc * 1000).toLocaleString() : 'Unknown'}\n`;
    
    if (post.content) {
      content += `Content:\n${post.content}\n`;
    }
    
    if (post.comments && post.comments.length > 0) {
      content += `\nComments:\n`;
      content += formatCommentsForExport(post.comments);
    }
    
    content += '\n';
  });

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `reddit_posts_r_${subredditDetail.subreddit}_${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Export posts as PDF
export const exportPostsAsPDF = ({ sortedPosts, subredditDetail, filterData }: ExportData) => {
  const pdf = new jsPDF();
  let yPosition = 20;
  const pageHeight = pdf.internal.pageSize.height;
  const margin = 20;
  const lineHeight = 7;

  // Add title
  pdf.setFontSize(16);
  pdf.text(`Reddit Posts Export - r/${subredditDetail.subreddit}`, margin, yPosition);
  yPosition += lineHeight * 2;

  // Add metadata
  pdf.setFontSize(10);
  pdf.text(`Export Date: ${new Date().toLocaleString()}`, margin, yPosition);
  yPosition += lineHeight;
  pdf.text(`Total Posts: ${sortedPosts.length}`, margin, yPosition);
  yPosition += lineHeight;
  pdf.text(`Search Term: ${filterData.searchTerm || 'None'}`, margin, yPosition);
  yPosition += lineHeight;
  pdf.text(`Sort By: ${filterData.sortBy}`, margin, yPosition);
  yPosition += lineHeight;
  pdf.text(`Upvotes Range: ${filterData.minUpvotes} - ${filterData.maxUpvotes}`, margin, yPosition);
  yPosition += lineHeight;
  pdf.text(`Comments Range: ${filterData.minComments} - ${filterData.maxComments}`, margin, yPosition);
  yPosition += lineHeight * 2;

  sortedPosts.forEach((post, index) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setFontSize(12);
    pdf.text(`${index + 1}. ${post.title.substring(0, 80)}${post.title.length > 80 ? '...' : ''}`, margin, yPosition);
    yPosition += lineHeight;

    pdf.setFontSize(8);
    pdf.text(`Author: ${post.author || 'Unknown'} | Score: ${post.score || 0} | Comments: ${getTotalCommentCount(post)}`, margin, yPosition);
    yPosition += lineHeight;

    if (post.content) {
      const contentLines = pdf.splitTextToSize(post.content.substring(0, 500), 170);
      contentLines.forEach((line: string) => {
        if (yPosition > pageHeight - 30) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.text(line, margin, yPosition);
        yPosition += lineHeight;
      });
    }

    yPosition += lineHeight;
  });

  // Save the PDF
  pdf.save(`reddit_posts_r_${subredditDetail.subreddit}_${new Date().toISOString().split('T')[0]}.pdf`);
};

// Export posts as JSON
export const exportPostsAsJSON = ({ sortedPosts, subredditDetail, filterData }: ExportData) => {
  const exportData = {
    metadata: {
      export_date: new Date().toISOString(),
      subreddit: subredditDetail.subreddit,
      total_posts: sortedPosts.length,
      filter_settings: filterData
    },
    posts: sortedPosts.map(post => ({
      id: post.id,
      title: post.title,
      author: post.author,
      score: post.score,
      num_comments: getTotalCommentCount(post),
      url: post.url,
      created_utc: post.created_utc,
      content: post.content,
      comments: post.comments
    }))
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `reddit_posts_r_${subredditDetail.subreddit}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Export posts as XML
export const exportPostsAsXML = ({ sortedPosts, subredditDetail, filterData }: ExportData) => {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<reddit_export>\n';
  xml += '  <metadata>\n';
  xml += `    <export_date>${new Date().toISOString()}</export_date>\n`;
  xml += `    <subreddit>${subredditDetail.subreddit}</subreddit>\n`;
  xml += `    <total_posts>${sortedPosts.length}</total_posts>\n`;
  xml += '    <filter_settings>\n';
  xml += `      <search_term>${filterData.searchTerm || ''}</search_term>\n`;
  xml += `      <sort_by>${filterData.sortBy}</sort_by>\n`;
  xml += `      <min_upvotes>${filterData.minUpvotes}</min_upvotes>\n`;
  xml += `      <max_upvotes>${filterData.maxUpvotes}</max_upvotes>\n`;
  xml += `      <min_comments>${filterData.minComments}</min_comments>\n`;
  xml += `      <max_comments>${filterData.maxComments}</max_comments>\n`;
  xml += '    </filter_settings>\n';
  xml += '  </metadata>\n';
  xml += '  <posts>\n';

  sortedPosts.forEach(post => {
    xml += '    <post>\n';
    xml += `      <id>${post.id}</id>\n`;
    xml += `      <title><![CDATA[${post.title}]]></title>\n`;
    xml += `      <author>${post.author || 'Unknown'}</author>\n`;
    xml += `      <score>${post.score || 0}</score>\n`;
    xml += `      <num_comments>${getTotalCommentCount(post)}</num_comments>\n`;
    xml += `      <url>${post.url || ''}</url>\n`;
    xml += `      <created_utc>${post.created_utc || 0}</created_utc>\n`;
    if (post.content) {
      xml += `      <content><![CDATA[${post.content}]]></content>\n`;
    }
    xml += '    </post>\n';
  });

  xml += '  </posts>\n';
  xml += '</reddit_export>';

  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `reddit_posts_r_${subredditDetail.subreddit}_${new Date().toISOString().split('T')[0]}.xml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Export posts as CSV
export const exportPostsAsCSV = ({ sortedPosts, subredditDetail, filterData }: ExportData) => {
  const headers = ['ID', 'Title', 'Author', 'Score', 'Comments', 'URL', 'Created Date', 'Content', 'All Comments'];
  
  // Add metadata rows at the top
  const metadataRows = [
    ['# Reddit Posts Export Metadata'],
    [`# Subreddit: r/${subredditDetail.subreddit}`],
    [`# Export Date: ${new Date().toLocaleString()}`],
    [`# Total Posts: ${sortedPosts.length}`],
    [`# Search Term: ${filterData.searchTerm || 'None'}`],
    [`# Sort By: ${filterData.sortBy}`],
    [`# Upvotes Range: ${filterData.minUpvotes} - ${filterData.maxUpvotes}`],
    [`# Comments Range: ${filterData.minComments} - ${filterData.maxComments}`],
    [''], // Empty row separator
  ];
  
  const csvContent = [
    ...metadataRows.map(row => row.join(',')),
    headers.join(','),
    ...sortedPosts.map(post => {
      const flattenComments = (comments: DatabaseComment[]): string => {
        if (!comments || comments.length === 0) return '';
        return comments.map(comment => 
          `[${comment.author || 'Unknown'}]: ${(comment.body || '').replace(/[,\n\r]/g, ' ')}`
        ).join(' | ');
      };

      return [
        post.id,
        `"${(post.title || '').replace(/"/g, '""')}"`,
        post.author || 'Unknown',
        post.score || 0,
        getTotalCommentCount(post),
        post.url || '',
        post.created_utc ? new Date(post.created_utc * 1000).toISOString() : '',
        `"${(post.content || '').replace(/"/g, '""')}"`,
        `"${flattenComments(post.comments || [])}"`
      ].join(',');
    })
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `reddit_posts_r_${subredditDetail.subreddit}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Export posts as Markdown
export const exportPostsAsMarkdown = ({ sortedPosts, subredditDetail, filterData }: ExportData) => {
  let content = `# Reddit Posts Export - r/${subredditDetail.subreddit}\n\n`;
  content += `**Export Date:** ${new Date().toLocaleString()}\n`;
  content += `**Total Posts:** ${sortedPosts.length}\n\n`;
  
  content += `## Filter Settings\n`;
  content += `- **Search Term:** ${filterData.searchTerm || 'None'}\n`;
  content += `- **Sort By:** ${filterData.sortBy}\n`;
  content += `- **Upvotes Range:** ${filterData.minUpvotes} - ${filterData.maxUpvotes}\n`;
  content += `- **Comments Range:** ${filterData.minComments} - ${filterData.maxComments}\n\n`;
  
  content += `## Posts\n\n`;

  sortedPosts.forEach((post, index) => {
    content += `### ${index + 1}. ${post.title}\n\n`;
    content += `- **Author:** ${post.author || 'Unknown'}\n`;
    content += `- **Score:** ${post.score || 0}\n`;
    content += `- **Comments:** ${getTotalCommentCount(post)}\n`;
    content += `- **URL:** ${post.url || 'N/A'}\n`;
    content += `- **Created:** ${post.created_utc ? new Date(post.created_utc * 1000).toLocaleString() : 'Unknown'}\n\n`;
    
    if (post.content) {
      content += `**Content:**\n${post.content}\n\n`;
    }
    
    if (post.comments && post.comments.length > 0) {
      content += `**Comments:**\n`;
      const formatMarkdownComments = (comments: DatabaseComment[], level: number = 0): string => {
        let result = '';
        comments.forEach(comment => {
          const indent = '  '.repeat(level);
          result += `${indent}- **${comment.author || 'Unknown'}** (Score: ${comment.score || 0}): ${comment.body || 'No content'}\n`;
          if (comment.replies && comment.replies.length > 0) {
            result += formatMarkdownComments(comment.replies, level + 1);
          }
        });
        return result;
      };
      content += formatMarkdownComments(post.comments);
    }
    
    content += '\n---\n\n';
  });

  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `reddit_posts_r_${subredditDetail.subreddit}_${new Date().toISOString().split('T')[0]}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}; 