---
id: articles/databricks-ai/4ded9fc65d.md
url: "https://www.databricks.com/blog/inbound-private-link-now-supports-account-level-genie-one-account-console-and-custom-urls"
url_hash: "4ded9fc65d"
kind: "article"
source: "databricks_ai"
title: "Inbound Private Link now supports account-level Genie One, the account console, and custom URLs"
author: ""
date: "Thu, 20 Aug 2026 22:00:00 GMT"
tier: 2
method: "source-native"
extracted_at: "2026-08-25T23:44:15.076805+00:00"
chars: 3574
engagement: "identify-high-converting-email-design-patterns-and-product-m"
collected_at: "2026-08-25T23:44:14.670Z"
relevance: 0
engagement_goal: "Identify high-converting email design patterns and product marketing trends for 2026 to guide the template redesign of a clean, organic cosmetics and skincare brand targeting Gen Z."
content_hash: "e9d74f048315668c"
relevance_by_goal: {"8429cfd39d4f":0}
chunks:
  - id: "articles/databricks-ai/4ded9fc65d.md#c0"
    char_span: [0, 245]
    sentence_count: 1
    key_terms: [inbound-private-link-now-supports-account-level-genie-one-account-console-and-custom-urls, account-level, databricks, supports, account, console, inbound, private]
    token_count: 55
    sources: [{"n":"databricks_ai","u":"https://www.databricks.com/blog/inbound-private-link-now-supports-account-level-genie-one-account-console-and-custom-urls","kind":"article","date":"2026-08-20"}]
  - id: "articles/databricks-ai/4ded9fc65d.md#c1"
    char_span: [247, 2970]
    sentence_count: 19
    key_terms: [account-level, private, inbound, link, endpoints, workspace, region, context-based]
    concepts: [account-level, private, inbound, context-based, endpoints]
    related_chunks: ["articles/databricks-ai/4ded9fc65d.md#c2"]
    token_count: 512
    sources: [{"n":"public IP or registered endpoint), and what they're allowed to reach in the work","u":""}]
  - id: "articles/databricks-ai/4ded9fc65d.md#c2"
    char_span: [2587, 3822]
    sentence_count: 11
    key_terms: [access, context-based, private, ingress, inbound, link, public, account-level]
    concepts: [context-based, access, private, ingress, inbound]
    related_chunks: ["articles/databricks-ai/4ded9fc65d.md#c1"]
    token_count: 217
    sources: [{"n":"databricks_ai","u":"https://www.databricks.com/blog/inbound-private-link-now-supports-account-level-genie-one-account-console-and-custom-urls","kind":"article","date":"2026-08-20"}]
---
# Inbound Private Link now supports account-level Genie One, the account console, and custom URLs

Source: [databricks_ai](https://www.databricks.com/blog/inbound-private-link-now-supports-account-level-genie-one-account-console-and-custom-urls)

Now supported in Beta on AWS and Azure: one shared General Access endpoint, in any region, for every workspace and account-level UI/API resource
by Robert Zhang, Manish Bansal, Chen He and Yankai Zhang
Enterprises adopting Databricks for their most sensitive data commonly rely on Inbound Private Link to keep user-to-Databricks traffic off the public internet, routing it privately through their own cloud network instead. As customers scale to many workspaces, multiple regions, and account-level products like Genie One, we've extended the capabilities for Inbound Private Link to meet them there.
Inbound Private Link now supports account-level resources, including account-level Genie One, the account console, Governance Hub, and account-level APIs. Customers can put account-level Genie One behind Inbound Private Link with the same network guarantees they already apply everywhere else.
Inbound Private Link now supports Custom URLs and Managed Disaster Recovery stable URLs. Inbound Private Link now works end to end with custom URLs such as acme.databricks.com. This extends to managed disaster recovery stable URLs (e.g., acme.databricks.com/?c=stable-ws-id).
One endpoint, any region, for every UI + API resource. A single shared General Access endpoint in any region can now serve all workspace and account-level UIs + APIs. Customers no longer need to create one endpoint per region or workspace. Teams with hard network isolation requirements can still use multiple endpoints; but those endpoints are no longer constrained to serving resources in the same region. This reduces the manual toil and cost needed to maintain many endpoints. Note: service-direct endpoints (for performance-intensive services) and SCC relay endpoints (for classic-compute secure cluster connectivity) still need to be configured per region.
These new Inbound Private Link capabilities are baked into context-based ingress controls, which let account admins write fined-grained allow and deny rules based on who is calling (identity), from where (network source: public IP or registered endpoint), and what they're allowed to reach in the workspace or account-level resource (destination).
Policies for account-level resources like the account console can be defined in the new account-policy.
Existing workspace policies have a new “private access” section for context-based Inbound Private Link configuration.
Inbound Private Link policies for both general access and service-direct can be configured in context-based ingress. Combined with existing public access support, context-based ingress gives you a single policy engine to configure both public and private ingress for workspaces and account-level resources.
We recommend customers configure context-based ingress instead of all-or-nothing IP access lists or Private Access Settings to gain the most benefit from our platform’s latest capabilities.
If you already use Inbound Private Link, this release is additive and non-disruptive. Non-custom workspace-specific URLs continue to work in parallel with custom URL access. Private access settings and IP access lists continue to work in parallel with context-based ingress (any policy deny leads to denial).
Enabling private access to account-level resources takes two steps:
All new Inbound Private Link capabilities described here are available now in Beta on AWS Enterprise tier and Azure Premium tier. Context-based ingress controls for public access are Generally Available. Try them both today!
Subscribe to our blog and get the latest posts delivered to your inbox.
