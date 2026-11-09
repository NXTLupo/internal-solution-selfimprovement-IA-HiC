---
id: articles/aws-ml-blog/d1fcabf838.md
url: "https://aws.amazon.com/blogs/machine-learning/introducing-cross-region-inference-for-openai-gpt-5-6-models-on-amazon-bedrock/"
url_hash: "d1fcabf838"
kind: "article"
source: "aws_ml_blog"
title: "Introducing cross-Region inference for OpenAI GPT-5.6 models on Amazon Bedrock"
author: ""
date: "Thu, 20 Aug 2026 21:46:03 +0000"
tier: 2
method: "source-native"
extracted_at: "2026-08-26T19:16:41.800216+00:00"
chars: 10000
engagement: "deliver-a-technical-architecture-and-implementation-blueprin"
collected_at: "2026-08-26T19:16:42.176Z"
relevance: 15
engagement_goal: "Deliver a technical architecture and implementation blueprint for Deciem's marketing and design teams to automate the email production workflow from Figma design to validated, sendable HTML using a multi-agent AI system, specifying agent roles, skills, and Model Context Protocol configurations that connect Figma libraries, brand guidelines, and design patterns while preserving creative flexibility and brand compliance, based on state of the art evidence current as of August 2026 and no earlier than January 2026. Define the reusable email component approach (including MJML), sending-platform and personalization-token integration, and the QA and validation criteria that qualify automated output as sendable."
content_hash: "c9f9863224cb594f"
relevance_by_goal: {"d21cb50b17ba":15}
chunks:
  - id: "articles/aws-ml-blog/d1fcabf838.md#c0"
    char_span: [0, 230]
    sentence_count: 1
    key_terms: [introducing-cross-region-inference-for-openai-gpt-5-6-models-on-amazon-bedrock, amazon, machine-learning, cross-region, introducing, inference, bedrock, models]
    concepts: [amazon]
    token_count: 62
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/introducing-cross-region-inference-for-openai-gpt-5-6-models-on-amazon-bedrock/","kind":"article","date":"2026-08-20"}]
  - id: "articles/aws-ml-blog/d1fcabf838.md#c1"
    char_span: [232, 2657]
    sentence_count: 17
    key_terms: [bedrock, amazon, inference, cross-region, openai, gpt-5, api, capacity]
    concepts: [bedrock, amazon, inference, cross-region, openai]
    related_chunks: ["articles/aws-ml-blog/d1fcabf838.md#c3", "articles/aws-ml-blog/d1fcabf838.md#c4"]
    token_count: 512
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/introducing-cross-region-inference-for-openai-gpt-5-6-models-on-amazon-bedrock/","kind":"article","date":"2026-08-20"}]
  - id: "articles/aws-ml-blog/d1fcabf838.md#c2"
    char_span: [2348, 4828]
    sentence_count: 14
    key_terms: [inference, global, profile, regions, gpt-5, openai, geographic, cross-region]
    concepts: [inference, global, profile, regions, gpt-5]
    related_chunks: ["articles/aws-ml-blog/d1fcabf838.md#c5"]
    token_count: 512
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/introducing-cross-region-inference-for-openai-gpt-5-6-models-on-amazon-bedrock/","kind":"article","date":"2026-08-20"}]
  - id: "articles/aws-ml-blog/d1fcabf838.md#c3"
    char_span: [4496, 6975]
    sentence_count: 17
    key_terms: [bedrock, amazon, openai, inference, api, model, global, choose]
    concepts: [bedrock, amazon, openai, inference, model]
    related_chunks: ["articles/aws-ml-blog/d1fcabf838.md#c1", "articles/aws-ml-blog/d1fcabf838.md#c4"]
    token_count: 512
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/introducing-cross-region-inference-for-openai-gpt-5-6-models-on-amazon-bedrock/","kind":"article","date":"2026-08-20"}]
  - id: "articles/aws-ml-blog/d1fcabf838.md#c4"
    char_span: [6638, 9291]
    sentence_count: 17
    key_terms: [amazon, bedrock, inference, cross-region, endpoint, model, profile, access]
    concepts: [amazon, bedrock, inference, cross-region, endpoint]
    related_chunks: ["articles/aws-ml-blog/d1fcabf838.md#c1", "articles/aws-ml-blog/d1fcabf838.md#c3"]
    token_count: 512
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/introducing-cross-region-inference-for-openai-gpt-5-6-models-on-amazon-bedrock/","kind":"article","date":"2026-08-20"}]
  - id: "articles/aws-ml-blog/d1fcabf838.md#c5"
    char_span: [8997, 10233]
    sentence_count: 12
    key_terms: [profile, inference, access, grants, region, foundation, source, model]
    concepts: [inference, profile, access, grants, region]
    related_chunks: ["articles/aws-ml-blog/d1fcabf838.md#c2"]
    token_count: 233
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/introducing-cross-region-inference-for-openai-gpt-5-6-models-on-amazon-bedrock/","kind":"article","date":"2026-08-20"}]
---
# Introducing cross-Region inference for OpenAI GPT-5.6 models on Amazon Bedrock

Source: [aws_ml_blog](https://aws.amazon.com/blogs/machine-learning/introducing-cross-region-inference-for-openai-gpt-5-6-models-on-amazon-bedrock/)

Artificial Intelligence
Introducing cross-Region inference for OpenAI GPT-5.6 models on Amazon Bedrock
This post is co-written with Chris Dickens from OpenAI.
Amazon Bedrock now offers OpenAI GPT-5.6 models on Amazon Bedrock in more than 25 AWS Regions, with cross-Region inference. Three GPT-5.6 variants support cross-Region inference, Sol, Terra, and Luna, each tuned for a different balance of capability and cost.
Cross-Region inference (CRIS) in Amazon Bedrock works through inference profiles, which define a model and the AWS Regions to which Amazon Bedrock can route a request. You call the profile from a source Region, and Amazon Bedrock routes the request to a destination Region using compute in that Region. CRIS is primarily a capacity mechanism. By allowing requests to draw on a broader pool of compute rather than being bound to one Region’s available capacity, it improves throughput and helps maintain consistent performance under load. A geographic inference profile routes requests within a single geography, so you can scale while keeping data processed within that geography. For GPT-5.6, this launch introduces US geographic (US cross-Region inference) and global CRIS. A global inference profile routes across all supported AWS commercial Regions where the model is deployed, based on real-time capacity, giving you broad access to Amazon Bedrock capacity.
In this post, we walk through an overview of GPT-5.6 models on Amazon Bedrock, how geographic and global cross-Region inference work for these models, and how to call them from the Amazon Bedrock console and in code with the OpenAI Responses API, the OpenAI Chat Completions API, and the Amazon Bedrock Converse API.
GPT-5.6 on Amazon Bedrock
The GPT-5.6 family on Amazon Bedrock includes general-purpose and specialized cyber security variants. This post covers the three general-purpose variants that support cross-Region inference, Sol, Terra, and Luna. All three accept text and image inputs and return text, have a 1 million token context window, and support reasoning mode, server-side tool calling, and prompt caching. You can call them with the OpenAI Responses API, the OpenAI Chat Completions API, and the Amazon Bedrock Converse API. Streaming is supported through the Responses and Chat Completions API (stream=True), and ConverseStream.
Amazon Bedrock inference profiles are logical identifiers you pass instead of a raw model ID.
- A geographic inference profile (prefixed with a geography code such as us., for example us.openai.gpt-5.6-terra) keeps inference processing within the Regions of its predefined geography. Requests enter through your source Region and can only be routed to destination Regions inside that geography, so workloads with data residency requirements can scale across Regions while staying within the boundary.
- A Global inference profile (prefixed global.such as global.openai.gpt-5.6-terra) can route a request to any supported commercial AWS Region where the model is deployed, based on real-time capacity. It offers the widest capacity pool and is the right choice when your workload has no geographic processing requirements.
Billing and quota consumption are tracked against your account regardless of which backend Region handled the request, so a single spending and throughput picture still applies. Data processed through global CRIS may cross the Regions in that model’s eligible set. If your workload has data residency requirements that restrict processing to specific geographies, use the geographic profile for that geography (such as us.openai.gpt-5.6-terra) or a direct call to one Region instead of the global profile. The Amazon Bedrock cross-Region inference documentation lists which Regions participate in each model’s global and geographic profile sets.
The following tables list the source Regions where you can invoke the GPT-5.6 inference profiles and the destination Regions where your requests can be processed. The same routing applies to all three variants: Sol, Terra, and Luna.
US cross-Region inference profile (us.openai.gpt-5.6-sol / -terra / -luna)
Global cross-Region inference profile (global.openai.gpt-5.6-sol / -terra / -luna)
Try GPT-5.6 in the Amazon Bedrock console
The quickest way to try GPT-5.6 is the text playground in the Amazon Bedrock console, which requires no coding or SDK setup. You can send prompts, adjust inference parameters, and switch between variants to get a feel for each model before you integrate the API. The model selector lists both the geographic and global cross-Region inference profiles, so you can test either cross-Region inference option before writing code. In the preceding screenshot, the source Region is US East (N. Virginia). The US entry in the model selector is the geographic inference profile, and the Global entry is the global inference profile.
- Open the Amazon Bedrock console in a Region where the models are available, such as US East (N. Virginia).
- In the navigation pane, under Test, choose Playground.
- Choose Select model in the middle of the page.
- Search for OpenAI GPT-5.6 Sol, select either US OpenAI GPT-5.6 Sol or Global OpenAI GPT-5.6 Sol, and choose Apply.
- Enter a prompt and choose Run to generate a response.
Getting started with the API
GPT-5.6 speaks the OpenAI Responses API formats natively on Amazon Bedrock. If your application already calls OpenAI models, you can point your existing OpenAI SDK client at the Amazon Bedrock OpenAI-compatible endpoint. Then swap in the inference profile ID (global or geographic) as the model parameter. For authentication, Amazon Bedrock accepts either standard AWS credentials or an Amazon Bedrock API key. The API key path is the most direct fit for the OpenAI SDK, which passes it as the bearer token. For production, generate short-term API keys programmatically using the aws-bedrock-token-generator package, which derives a bearer token from your existing AWS credentials (long-term keys are recommended only for exploration).
For the full list of supported parameters, see the OpenAI GPT model parameters page in the Amazon Bedrock User Guide. The same client also works with the Chat Completions API, useful if your application already uses this format.
If you’re calling Amazon Bedrock directly rather than through the OpenAI SDK, use the Amazon Bedrock Converse API, which gives you the same request shape you already use for other models on Bedrock:
For streaming responses, call converse_stream with the same arguments and iterate over the event stream:
Choosing between Amazon Bedrock Mantle and Runtime endpoints
For new applications, we recommend the bedrock-runtime endpoint. It supports the Amazon Bedrock-native InvokeModel and Converse APIs, the OpenAI-compatible Responses and Chat Completions APIs, and the Anthropic Messages API, and it is where Amazon Bedrock features such as Guardrails, intelligent prompt routing, and cross-Region inference are available. Amazon Bedrock also supports a second endpoint, bedrock-mantle, which currently offers additional capabilities such as server-side and pre-configured tool use (including web search), and creating Projects and Workspaces. To see which endpoint each model supports, see Endpoint availability.
Security and compliance
Cross-Region inference uses the same Amazon Bedrock security model as direct in-Region calls. Requests are authenticated with your AWS Identity and Access Management (IAM) credentials, and IAM policies control which inference profiles a role can invoke. Amazon Bedrock uses a zero-operator access (ZOA) security model enforced at the chip, so no AWS operators can access your prompts or completions. Every model call runs under your IAM policies, can be reached privately from your virtual private cloud (VPC) through a VPC endpoint, and is logged on AWS CloudTrail. Data perimeter policies help prevent exfiltration across account and network boundaries.
For certain models, including GPT-5.6, content flagged by the Amazon Bedrock automated abuse-detection classifiers is retained for up to 30 days for offline abuse detection. To see which models this applies to and how it works, see Abuse detection in the Amazon Bedrock User Guide. To understand more about data retention configuration on Bedrock, see the Amazon Bedrock data retention documentation. For the authoritative list of Regions in each profile’s routing set, see the Amazon Bedrock cross-Region inference support page.
Cross-Region inference requests appear on AWS CloudTrail in your source Region, and the additionalEventData.inferenceRegion field records which Region processed each request. If you enable model invocation logging, the request and response payloads are delivered to Amazon Simple Storage Service (Amazon S3) or Amazon CloudWatch Logs in the same account and Region.
Setting up IAM permissions for cross-Region inference
To let a role invoke GPT-5.6 through an inference profile, grant it access to the inference profile and to the foundation model in every Region the profile can route to. You can use this managed policy AmazonBedrockLimitedAccess or create your own.
For a geographic inference profile, the policy has three statements. The first grants access to the geographic inference profile and the default project in your source Region. The second grants access to the foundation model in your source Region and in every destination Region in the geography, with a condition that limits this access to requests made through that profile. The third grants the bearer-token authentication the OpenAI-compatible APIs use.
A global inference profile uses a four-part policy. The first grants access to the global inference profile and the default project in your source Region. The second grants access to the foundation model in your source Region. The third grants access to the foundation model through the Region-agnostic global ARN, which is what enables cross-Region routing. The fourth grants the bearer-token authentication us
