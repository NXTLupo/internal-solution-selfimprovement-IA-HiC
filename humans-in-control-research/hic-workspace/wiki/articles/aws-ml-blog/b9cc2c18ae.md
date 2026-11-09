---
id: articles/aws-ml-blog/b9cc2c18ae.md
url: "https://aws.amazon.com/blogs/machine-learning/huntington-bank-redacting-sensitive-data-from-400m-documents-with-aws/"
url_hash: "b9cc2c18ae"
kind: "article"
source: "aws_ml_blog"
title: "Huntington Bank: Redacting sensitive data from 400M+ documents with AWS"
author: ""
date: "Wed, 24 Jun 2026 18:24:50 +0000"
tier: 2
method: "pack-search-backfill"
extracted_at: "2026-07-02T16:08:50.249799+00:00"
chars: 7979
engagement: "define-the-2026-state-of-the-art-operational-and-technologic"
collected_at: "2026-07-02T16:08:48+00:00"
content_hash: "e9de96df368df971"
chunks:
  - id: "articles/aws-ml-blog/b9cc2c18ae.md#c0"
    char_span: [0, 214]
    sentence_count: 1
    key_terms: [huntington-bank-redacting-sensitive-data-from-400m-documents-with-aws, aws, machine-learning, huntington, documents, redacting, sensitive, amazon]
    token_count: 53
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/huntington-bank-redacting-sensitive-data-from-400m-documents-with-aws/","kind":"article","date":"2026-06-24"}]
  - id: "articles/aws-ml-blog/b9cc2c18ae.md#c1"
    char_span: [216, 2904]
    sentence_count: 16
    key_terms: [huntington, documents, aws, data, amazon, on-premises, sensitive, requirements]
    concepts: [huntington, documents, on-premises, amazon, sensitive]
    related_chunks: ["articles/aws-ml-blog/b9cc2c18ae.md#c2", "articles/aws-ml-blog/b9cc2c18ae.md#c3"]
    token_count: 512
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/huntington-bank-redacting-sensitive-data-from-400m-documents-with-aws/","kind":"article","date":"2026-06-24"}]
  - id: "articles/aws-ml-blog/b9cc2c18ae.md#c2"
    char_span: [2578, 5575]
    sentence_count: 23
    key_terms: [amazon, textract, aws, documents, service, huntington, functions, sensitive]
    concepts: [amazon, textract, documents, huntington, service]
    related_chunks: ["articles/aws-ml-blog/b9cc2c18ae.md#c1", "articles/aws-ml-blog/b9cc2c18ae.md#c3"]
    token_count: 512
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/huntington-bank-redacting-sensitive-data-from-400m-documents-with-aws/","kind":"article","date":"2026-06-24"}]
  - id: "articles/aws-ml-blog/b9cc2c18ae.md#c3"
    char_span: [5224, 8021]
    sentence_count: 22
    key_terms: [redaction, huntington, processing, amazon, aws, textract, documents, functions]
    concepts: [redaction, huntington, processing, amazon, textract]
    related_chunks: ["articles/aws-ml-blog/b9cc2c18ae.md#c1", "articles/aws-ml-blog/b9cc2c18ae.md#c2"]
    token_count: 512
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/huntington-bank-redacting-sensitive-data-from-400m-documents-with-aws/","kind":"article","date":"2026-06-24"}]
  - id: "articles/aws-ml-blog/b9cc2c18ae.md#c4"
    char_span: [7760, 8196]
    sentence_count: 1
    key_terms: [aws, acknowledgements, contributions, individuals, montgomery, womorrow, brenneman, burkhardt]
    token_count: 108
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/huntington-bank-redacting-sensitive-data-from-400m-documents-with-aws/","kind":"article","date":"2026-06-24"}]
---
# Huntington Bank: Redacting sensitive data from 400M+ documents with AWS

Source: [aws_ml_blog](https://aws.amazon.com/blogs/machine-learning/huntington-bank-redacting-sensitive-data-from-400m-documents-with-aws/)

Artificial Intelligence
Huntington Bank: Redacting sensitive data from 400M+ documents with AWS
When your document repository contains hundreds of millions of files accumulated over nearly a decade, how do you systematically find and redact sensitive customer data without taking years to complete? This was the challenge facing The Huntington National Bank (Huntington), a top 10 bank in the United States.
Redacting sensitive information at scale
Since 2015, Huntington’s document management system has securely stored hundreds of millions of documents on-premises. In 2025, as part of a proactive compliance initiative, Huntington set out to process the documents in this system and redact sensitive data. These documents come in different formats, so the solution needed flexibility to handle varied file types while delivering the throughput required to process millions of documents quickly.
Original estimates indicated this effort would take years. However, by designing a scalable redaction workflow using Amazon Textract, Amazon SageMaker, AWS Step Functions, and AWS Lambda, Huntington reduced this timeline to months.
Solution overview
Before examining the technical implementation, let’s look at the core requirements Huntington established for this project. If you’re facing a similar large-scale document processing challenge, these requirements can serve as a starting point for your own solution design:
- Data must be encrypted at rest and in transit.
- Locations where data is stored or accessed must meet strict access requirements.
- Services used must be in-scope for PCI DSS compliance.
- Outputs must be replicated back to on-premises data stores.
- Redaction accuracy must meet or exceed 95% to meet compliance requirements.
The following diagram illustrates the high-level solution architecture.
Moving data securely, with confidence
Huntington’s first objective was to move documents from an on-premises file share to an Amazon Simple Storage Service (Amazon S3) bucket. Moving documents is straightforward, but this effort required transferring over 400 million documents, encrypted in transit and at rest. To accomplish this, Huntington used AWS DataSync, AWS Direct Connect, Amazon S3, and AWS Key Management Service (AWS KMS).
AWS DataSync can be deployed as an agent in your on-premises data center to monitor a configured source, such as an SMB file share. While getting documents to AWS was critical for processing, AWS DataSync also supports syncing data back to on-premises, which was another key requirement for this project.
Detecting sensitive data using Amazon Textract
Amazon Textract is an AWS machine learning service that extracts text, tables, and forms from scanned documents. Financial institutions use it to automatically process documents like account statements or loan applications, then identify sensitive data such as Social Security numbers, account numbers, and personal addresses. The following sample invoice demonstrates this capability.
Amazon Textract detects various fields from a document and provides coordinates of detected fields and other metadata within a JSON output.
Huntington used Amazon Textract in an orchestrated process with AWS Step Functions. This approach reduced manual review time while improving accuracy in detecting sensitive information across large document volumes.
Scaling detection throughput
Automated pipelines for document processing are valuable, but processing documents sequentially would have extended the project timeline to years. To meet their goal, Huntington needed to process millions of documents each day.
Scaling to this level required addressing two main considerations: maximizing concurrent Amazon Textract jobs within service quotas, and controlling request rates to avoid throttling.
AWS services have quotas that can be adjusted through soft and hard limits. The Amazon Textract jobs-per-second quota can be increased by submitting a request through the AWS Service Quotas console.
To maximize throughput against the service quota, Huntington used the AWS Step Functions built-in map state, which processes collections of inputs in JSON, CSV, or other formats. The team organized documents in Amazon S3 into a JSON collection and ran the map state in distributed mode for higher concurrency. To track pipeline progress, they used AWS Step Functions map run execution summaries alongside Amazon CloudWatch dashboards to monitor response times, throttle counts, successes, and error rates.
To address potential throttling, Huntington monitored their CloudWatch dashboard to verify Amazon Textract successful request counts and throttled counts. As needed, they adjusted concurrency limits for child workflow executions to confirm they remained under the Amazon Textract service quota while maintaining high throughput. When jobs completed successfully, detected fields and metadata were written to a bucket for later review. The following diagram depicts this approach:
The wait block within the step function verified the process was ready to proceed with writing job metadata and continuing with the next Amazon Textract invocation. When there are no failures, the state machine finishes with a pass state. When failures occur, AWS Step Functions writes to a log for human review and reprocessing.
Redacting detected sensitive information
Up to this point, the process focused on detecting sensitive data and cataloging it within metadata files written to Amazon S3. The final steps are to redact the documents and transmit them back to on-premises storage.
Image and PDF redaction is supported by several open-source and proprietary tools. Common open-source Python libraries include PyMuPDF or image drawing libraries like PIL. The following figure shows a sample redaction of the invoice shown earlier. Amazon Textract supports detection of various fields, and you can also create custom classifications using regex patterns. Combined with redaction software, you can confidently redact detected fields. If you want to create a threshold for human intervention, Amazon Textract provides confidence scores that can trigger validation workflows.
Once again, Huntington faced the same architectural challenge: how would this scale? AWS Step Functions provided the solution for processing millions of documents while offering hooks for error handling and retry logic. As the document processing pipeline cataloged objects requiring redaction, Huntington ran a simple flow against them:
To verify accuracy and thoroughness, Huntington double-checked that detected fields matched expected patterns prior to redaction, followed by a metadata update for each file. Redacted files were placed in an Amazon S3 location monitored by AWS DataSync for transmission back to on-premises file storage.
Conclusion
Using AWS, Huntington processed documents at a rate of approximately 10 million per day, reducing estimated processing time from years to just a few months. The cost of processing the entire document repository was approximately 5% of the original estimate. Redaction accuracy exceeded 95%, meeting compliance requirements and supporting data security objectives.
This project demonstrates how AWS services can support large-scale data processing and compliance initiatives. Huntington plans to continue using this framework for high-volume redaction needs such as mergers and acquisitions.
To learn more about the services used in this solution, visit the Amazon Textract detail page or explore the AWS Step Functions documentation.
Acknowledgements
Special thanks to the following individuals and teams for their contributions: Xuelei Yuan, Robert Carnell, Jeanne Keith, Debbie Montgomery, Bill Gross, Jodi Pettiford, Jon Glazer, Marshall Doss, Bob Womorrow, Tami Wolf, Marijane Eldridge, Pradeep Kumar Tata, Michael Burkhardt, Nirmal Antony, Trevor Pease, Bryan Griffith, Angus Ferguson (AWS) Randy Patrick (AWS), Stephanie Brenneman (AWS), Art Steele, Kevin Owen.
