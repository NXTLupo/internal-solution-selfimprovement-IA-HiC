---
id: articles/hugging-face-blog/01dbb5ccff.md
url: "https://huggingface.co/blog/ibm-research/vakra-benchmark-analysis"
url_hash: "01dbb5ccff"
kind: "article"
source: "Hugging Face Blog"
title: "Inside VAKRA: Reasoning, Tool Use, and Failure Modes of Agents"
author: ""
date: "Wed, 15 Apr 2026 12:07:25 GMT"
tier: 2
method: "source-native"
extracted_at: "2026-08-13T17:11:59.269879+00:00"
chars: 10000
engagement: "analyze-the-executive-search-industry-to-map-current-trends"
collected_at: "2026-08-13T17:11:55.018Z"
relevance: 10
engagement_goal: "Analyze the executive search industry to map current trends against DSG Global's specific operational pain points (as well as market research validated industry-wide use cases), producing a structured assessment of targeted AI use cases, their implementation feasibility, and expected efficiency gains to address these challenges."
content_hash: "bfb1a35f7e8cd3e3"
relevance_by_goal: {"bb7e192171b3":10}
chunks:
  - id: "articles/hugging-face-blog/01dbb5ccff.md#c0"
    char_span: [0, 160]
    sentence_count: 1
    key_terms: [vakra-benchmark-analysis, blog, ibm-research, huggingface, reasoning, failure, hugging, agents]
    token_count: 44
    sources: [{"n":"Hugging Face Blog","u":"https://huggingface.co/blog/ibm-research/vakra-benchmark-analysis","kind":"article","date":"2026-04-15"}]
  - id: "articles/hugging-face-blog/01dbb5ccff.md#c1"
    char_span: [162, 2477]
    sentence_count: 9
    key_terms: [vakra, tasks, agents, capability, arguments, benchmark, reasoning, tool]
    concepts: [vakra, tasks, capability, agents, arguments]
    token_count: 512
    sources: [{"n":"Hugging Face Blog","u":"https://huggingface.co/blog/ibm-research/vakra-benchmark-analysis","kind":"article","date":"2026-04-15"}]
  - id: "articles/hugging-face-blog/01dbb5ccff.md#c2"
    char_span: [2231, 4443]
    sentence_count: 9
    key_terms: [data, arguments, instance, name, collection, slot-bird, source, label]
    concepts: [arguments, instance, collection, slot-bird, source]
    token_count: 512
    sources: [{"n":"Hugging Face Blog","u":"https://huggingface.co/blog/ibm-research/vakra-benchmark-analysis","kind":"article","date":"2026-04-15"}]
  - id: "articles/hugging-face-blog/01dbb5ccff.md#c3"
    char_span: [4232, 6465]
    sentence_count: 15
    key_terms: [capability, instances, apis, tool, dtype, tools, multi-hop, api]
    concepts: [capability, instances, multi-hop, domain-specific, dtype]
    token_count: 512
    sources: [{"n":"Hugging Face Blog","u":"https://huggingface.co/blog/ibm-research/vakra-benchmark-analysis","kind":"article","date":"2026-04-15"}]
  - id: "articles/hugging-face-blog/01dbb5ccff.md#c4"
    char_span: [6123, 8736]
    sentence_count: 21
    key_terms: [capability, document, policies, distribution, information, queries, agent, api]
    concepts: [capability, distribution, document, policies, information]
    token_count: 512
    sources: [{"n":"This segment adds document indices per domain. Queries in this capability could ","u":""}]
  - id: "articles/hugging-face-blog/01dbb5ccff.md#c5"
    char_span: [8412, 10163]
    sentence_count: 11
    key_terms: [evaluation, tool, environment, trajectory, predicted, waterfall-style, intermediate, final]
    concepts: [evaluation, environment, trajectory, predicted, waterfall-style]
    token_count: 315
    sources: [{"n":"Hugging Face Blog","u":"https://huggingface.co/blog/ibm-research/vakra-benchmark-analysis","kind":"article","date":"2026-04-15"}]
---
# Inside VAKRA: Reasoning, Tool Use, and Failure Modes of Agents

Source: [Hugging Face Blog](https://huggingface.co/blog/ibm-research/vakra-benchmark-analysis)

Inside VAKRA: Reasoning, Tool Use, and Failure Modes of Agents
VAKRA Dataset | LeaderBoard | Release Blog | GitHub | Submit to Leaderboard
We recently introduced VAKRA, a tool-grounded, executable benchmark for evaluating how well AI agents reason and act in enterprise-like environments.
Unlike traditional benchmarks that test isolated skills, VAKRA measures compositional reasoning across APIs and documents, using full execution traces to assess whether agents can reliably complete multi-step workflows.
VAKRA provides an executable environment where agents interact with over 8,000+ locally hosted APIs backed by real databases spanning 62 domains, along with domain-aligned document collections. Tasks can require 3-7 step reasoning chains that combine structured API interaction with unstructured retrieval under natural-language tool-use constraints.
As can be seen below, models perform poorly on VAKRA - in this blog, we include additional dataset details about the tasks in VAKRA and present an analysis of failure modes we observed on different tasks.
Task Description
As shown below, the VAKRA benchmark comprises of four tasks, each testing a different set of capabilities.
Fig 1: Representative examples of each capability in the VAKRA benchmark
Capability 1: API Chaining using Business Intelligence APIs
This capability includes 2,077 test instances across 54 domains, requiring the use of tools from the SLOT-BIRD and SEL-BIRD collections (Elder et al., 2026). Compared to the setup in Elder et al., the tool universe in SLOT-BIRD and SEL-BIRD is expanded through the inclusion of a larger number of domains. Each domain is restricted to one tool collection, and tasks involve chaining 1–12 tool calls to arrive at the final answer.
{
  "query": "Which football team has a build-up play speed of 31, build-up plan dribbling of 53, and build-up play passing of 32?",
  "tool_calls":[
      {
        "name": "get_data",
        "arguments":{"tool_universe_id="486ea46224d1-aeb8037c5e78"},
        "label": "retrieved_data_1"
      },
      {
        "name": "select_data_equal_to",
        "arguments":{"data_label":"retrieved_data_1","key_name":"play_speed","value":31},
        "label": "FILTERED_DF_0"
      },
      {
        "name": "select_data_equal_to",
        "arguments":{"data_label":"FILTERED_DF_0","key_name":"play_dribble","value":53},
        "label": "FILTERED_DF_1"
      },
      {
        "name": "select_data_equal_to",
        "arguments":{"data_label":"FILTERED_DF_1","key_name":"play_passing","value":32},
        "label": "FILTERED_DF_2"
      },
      {"name":{get_team_name},"arguments":{"data_label":"FILTERED_DF_2","n":1}}}],
  "answer": "FC Barcelona"
}
Fig 2: Data sample from SEL-BIRD collection
As shown above, each instance has an associated JSON data source from which the answer must be derived. The MCP servers supporting this task include a special tool, called get_data(tool_universe_id=id), which must be called at the beginning of each instance.
This tool initializes the data source, returns a lightweight preview of the data (see below Figure 3), and stores the full dataset server-side to avoid large data transfers. This prevents the inefficient transfer of large data over the MCP protocol. The call also configures the MCP server to expose the appropriate tool set based on the tool_universe_id and aligns the data source with the domain-specific database for the instance.
The SLOT-BIRD collection provides a global set of 7 tools for generic data manipulation (e.g., filtering, sorting), inspired by systems like Tableau and 
Google Analytics. The SEL-BIRD collection extends this by introducing more specialized tools: some are shared with SLOT-BIRD, while others are derived by flattening categorical arguments into separate functions (e.g., sort_data with argument ascending: bool = False becomes sort_data_ascending and sort_data_descending). Additionally, the generic (retrieve_data) function from SLOT-BIRD is replaced with query-specific getters. Every key in the data for a given instance has an associated get function (get_KEY_NAME) for an average of 4 get functions per instance.
{
  "handle": "retrieved_data_1",
  "num_records": 2,
  "key_details": [
    {"name": "team_name", "dtype": "str", "first_3_values": ["FC Barcelona", "Manchester City"]},
    {"name": "play_speed", "dtype": "int32", "first_3_values": [31, 40]},
    {"name": "play_dribble", "dtype": "int32", "first_3_values": [53, 30]},
    {"name": "play_passing", "dtype": "int32", "first_3_values": [32, 16]}
  ]}
Fig 3: Data preview obtained from `get_data` function
Capability 2: Tool Selection using Dashboard APIs
This capability includes 1,597 instances across 17 domains, requiring tools from an expanded REST-BIRD collection (Elder et al.).
These use endpoint-style interfaces that provide highly specific, query-aligned endpoints that encapsulate most computation. They are served as REST APIs running in a FastAPI server, which is wrapped by the MCP server. This task requires selecting the correct APIs from the domain-specific tool set (as shown in the example in Figure 1). Each domain contains a minimum of 6 to a maximum of 328 tools (with an average of 116 tools). Similar to the previous task, the get_data tool configures the MCP server to expose only the relevant domain-specific APIs.
The OpenAI API Specification restricts the tool list input to a maximum length of 128 tools. This restriction requires an agent builder using this API to manage the length of the tool list directly via a shortlisting mechanism. In the baseline agents in our repository, a simple shortlisting capability handles this challenge.
Capability 3: Multi-Hop Reasoning using Dashboard APIs
The Capability 3 segment of the benchmark has 869 test instances drawn from 38 subject domains. These instances rely again on the REST-BIRD API collection, but add multi-hop reasoning to the challenge (refer to example in Figure 1). Multi-hop questions require multiple pieces of supporting evidence to be extracted and combined to reach an answer. The instances in this section require between one and five logical hops to answer a query. The question types distribution for queries within the test dataset is shown below in Figure 4.
Fig 4: API Hop-Type distribution for Capability 3 (MultiHop) and Hybrid Hop-Type distribution for Capability 4 (MultiHop MultiSource Reasoning)
Capability 4: Multi-Hop, Multi-Source Reasoning and Policy Adherence
Capability 4 includes 644 instances across 41 domains and is also built on the REST-BIRD API collection. Figure 4 above shows a distribution of hybrid hops for test queries without policies. It contains the most complex queries with the following characteristics:
Multi-Source: This segment adds document indices per domain. Queries in this capability could require information from these document indexes as well as API calls. Similar to Capability 3, this task also has Multi-Hop queries. The required information source applies at the per-hop level, so, for example, a question may entail three logical hops with sources: API - RAG (Document Retrieval) - API. To enforce correct reasoning, sources are decontaminated during data generation, i.e. information required for a given hop is available in only one source. For example, if a hop is to be answered using APIs, the document index is built by removing documents that likely contain the information needed to answer the question.
Multi-Turn: This segment of the dataset also adds multi-turn conversations to the setting. Each instance is a dialog with multiple turns. The data is released as context-response pairs, where the context encodes the current dialog history and the agent is only responsible for answering the current turn.
Tool-usage Policies: A subset of these instances includes tool-use policies that the agent is required to follow. These policies take the form of plain-text instructions about the knowledge sources that the agent is allowed to access and under which circumstances. For example:
If a user's query pertains to Technology & Software, which is/are about Topics focusing on codebases,
software platforms, applications, and user interactions in tech, make sure you try answering them by
only using document retrievers. Do not use other types of tools.
The baseline agent in the project repo imposes adherence to these policies through a simple addition to the prompt: "You are a helpful assistant with access to tools.\n Tool Usage Constraint: {additional_instructions}.". Of course, agent builders are free to choose any constraint enforcement mechanism.
Evaluation Framework
VAKRA evaluates agents in tool environments where success depends on both the ability to execute coherent, multi-step workflows and answer correctness. We introduce an execution-centric evaluation framework that assesses not only final outputs but also the full tool-execution trajectory that includes tool calls, inputs, and intermediate results.
Evaluation Metric
The VAKRA Evaluator operates over two key inputs for each sample: a predicted final response and the corresponding tool-call trajectory. The tool calls from the predicted trajectory are executed in the same environment as the ground truth to verify intermediate tool outputs.
The evaluation follows a waterfall-style pipeline (Figure 6), where later stages are conditioned on earlier success:
- For Capability 4 tasks, policy adherence is first verified programmatically (this step is not applied to other capabilities).
- The predicted tool call sequence is then compared against the ground truth sequence.
- Only samples with valid trajectories proceed to final response evaluation.
Fig 6: Waterfall-style Evaluation Pipeline
Tool-Sequence Comparison Due to the presence of an executable environment, agents can explore the environment and sometimes return the answer by invoking a different set of APIs than the ones identified by us. In order to support alternative but valid tool invoc
