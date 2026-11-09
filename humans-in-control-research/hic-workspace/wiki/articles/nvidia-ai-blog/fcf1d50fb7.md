---
id: articles/nvidia-ai-blog/fcf1d50fb7.md
url: "https://blogs.nvidia.com/blog/physical-ai-halos-safety/"
url_hash: "fcf1d50fb7"
kind: "article"
source: "nvidia_ai_blog"
title: "Why Deploying Physical AI at Scale Demands Safety at Every Layer"
author: ""
date: "Mon, 21 Sep 2026 16:00:46 +0000"
tier: 3
method: "source-native"
extracted_at: "2026-10-09T16:50:13.740271+00:00"
chars: 8228
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
collected_at: "2026-10-09T16:50:13.611Z"
relevance: 15
engagement_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
content_hash: "e853705e6911c77e"
relevance_by_goal: {"aa6916010743":15}
chunks:
  - id: "articles/nvidia-ai-blog/fcf1d50fb7.md#c0"
    char_span: [0, 149]
    sentence_count: 1
    key_terms: [physical-ai-halos-safety, deploying, physical, demands, nvidia, safety, source, blogs]
    token_count: 40
    sources: [{"n":"nvidia_ai_blog","u":"https://blogs.nvidia.com/blog/physical-ai-halos-safety/","kind":"article","date":"2026-09-21"}]
  - id: "articles/nvidia-ai-blog/fcf1d50fb7.md#c1"
    char_span: [151, 3120]
    sentence_count: 23
    key_terms: [safety, physical, deployment, behavior, requires, software, environments, operating]
    concepts: [safety, physical, deployment, environments, behavior]
    token_count: 512
    sources: [{"n":"nvidia_ai_blog","u":"https://blogs.nvidia.com/blog/physical-ai-halos-safety/","kind":"article","date":"2026-09-21"}]
  - id: "articles/nvidia-ai-blog/fcf1d50fb7.md#c2"
    char_span: [2738, 5666]
    sentence_count: 12
    key_terms: [safety, nvidia, halos, validation, across, provides, foundation, functional]
    concepts: [safety, nvidia, halos, validation, across]
    related_chunks: ["articles/nvidia-ai-blog/fcf1d50fb7.md#c3", "articles/nvidia-ai-blog/fcf1d50fb7.md#c4"]
    token_count: 512
    sources: [{"n":"nvidia_ai_blog","u":"https://blogs.nvidia.com/blog/physical-ai-halos-safety/","kind":"article","date":"2026-09-21"}]
  - id: "articles/nvidia-ai-blog/fcf1d50fb7.md#c3"
    char_span: [5295, 7739]
    sentence_count: 16
    key_terms: [nvidia, safety, halos, software, certification, systems, inspection, building]
    concepts: [nvidia, safety, halos, certification, software]
    related_chunks: ["articles/nvidia-ai-blog/fcf1d50fb7.md#c2", "articles/nvidia-ai-blog/fcf1d50fb7.md#c4"]
    token_count: 512
    sources: [{"n":"nvidia_ai_blog","u":"https://blogs.nvidia.com/blog/physical-ai-halos-safety/","kind":"article","date":"2026-09-21"}]
  - id: "articles/nvidia-ai-blog/fcf1d50fb7.md#c4"
    char_span: [7491, 8380]
    sentence_count: 8
    key_terms: [halos, nvidia, inspection, physical, systems, certification, companies, robotics]
    concepts: [halos, inspection, nvidia, physical, certification]
    related_chunks: ["articles/nvidia-ai-blog/fcf1d50fb7.md#c2", "articles/nvidia-ai-blog/fcf1d50fb7.md#c3"]
    token_count: 187
    sources: [{"n":"nvidia_ai_blog","u":"https://blogs.nvidia.com/blog/physical-ai-halos-safety/","kind":"article","date":"2026-09-21"}]
---
# Why Deploying Physical AI at Scale Demands Safety at Every Layer

Source: [nvidia_ai_blog](https://blogs.nvidia.com/blog/physical-ai-halos-safety/)

Physical AI is moving rapidly from research to large-scale deployment. By 2035, ABI Research projects an installed base of 49 million level 3-5 autonomous vehicles (AVs), while Omdia estimates that roughly 60 million industrial robots will be deployed between 2026 and 2035. As these machines enter roads, factories, warehouses and other environments shared with people, safety must scale with them.
Physical AI safety means proving that AI-driven machines — AVs, humanoid robots, industrial robots and more — behave safely when their decisions turn into physical action. That requires safety across the hardware, software, AI, operating environment and deployment lifecycle — not a one-time check before deployment.
Why Is Safety the Key to Scaling Physical AI?
After years of testing and benchmarking, AVs continue to expand commercially. That progress has required developers to demonstrate how automated systems address potential hardware and software failures, limitations in intended functionality and AI-specific risks.
Robotics is approaching a similar inflection point as autonomous machines move into factories, warehouses and other environments shared with people.
Across physical AI, manufacturers, regulators, insurers and workplace safety teams need evidence that hardware, software, AI behavior and operating environments can work together safely without human intervention.
Why Does Physical AI Need a New Safety Model?
Four shifts define new safety standards:
- Dynamic environments require context-aware safety. Roads, factories and warehouses cannot be fully controlled through static zones or physical barriers. Autonomous systems must perceive changing conditions, adapt their behavior and reach a safe state when something unexpected occurs.
- AI behavior requires its own assurance. Testing must assess AI software alongside traditional functional safety, using design-time, runtime and validation-time guardrails. Emerging standards such as ISO/IEC TS 22440 are beginning to address these AI-specific risks.
- Deployment is ongoing. AVs and robots evolve through software and model updates, new tasks and changing operating conditions. Material changes may require additional safety testing.
- Validation at scale requires simulation and synthetic data. The number and complexity of potential scenarios requires real-world testing to be combined with simulation, synthetic data generation and scenario reconstruction.
Together, these shifts require safety to be operationalized across design, deployment and validation, from the underlying hardware to AI behavior and the operating environment.
What Safety Foundation Has NVIDIA Built for Physical AI?
Physical AI safety requires specialized engineering, data, processes and validation that few companies can reproduce alone. NVIDIA’s safety foundation draws on more than a decade of development in AV safety, building expertise in functional safety, sensor fusion, AI behavior assurance, vision AI, simulation and real-world validation.
NVIDIA Halos is the first and only full-stack safety system for physical AI, helping developers engineer safety across every layer of design, validation and deployment. The principles are shared across AVs and robotics, while the platforms, standards and evidence remain specific to each domain.
For AV development, Halos spans:
- Hardware: NVIDIA DRIVE AGX Thor provides safety-engineered accelerated compute, while NVIDIA Hyperion provides the full-stack vehicle platform and reference architecture for level 4 AVs.
- Operating system and middleware: Halos OS provides a unified software foundation built on ASIL-D certified DriveOS. Halos Core and Halos Middleware support system isolation, monitoring and deterministic communication.
- End-to-end model: NVIDIA Alpamayo offers open reasoning vision language action models that bring explainability to long-tail scenarios.
- Simulation and validation: The NVIDIA Halos Safety Evaluation Framework provides tools and guidelines for generating evidence to support AV safety cases across different levels of automation.
Together, these elements connect cloud-based AI development and simulation with in-vehicle deployment so safety evidence can remain traceable across the vehicle lifecycle.
For robotics, Halos spans:
- Hardware: NVIDIA IGX Thor is an industrial-grade module that combines accelerated computing and functional safety on one platform with a dedicated Functional Safety Island. It’s designed to support systems developed for standards including IEC 61508 and ISO 13849.
- Software: Halos Core for IGX provides the software foundation for safety-related operating functions, including fault detection, monitoring and reporting, along with the communication and processing capabilities that connects sensors, actuators and other safety components
- Real-time sensing: NVIDIA Holoscan Sensor Bridge connects sensor data with AI and safety-related processing, helping systems identify invalid information and execute defined safety responses.
- Simulation and validation: NVIDIA Isaac Lab and NVIDIA Omniverse libraries let developers test robot behavior across relevant conditions and edge cases, complementing real-world validation.
- Outside-in safety: The open source NVIDIA Halos Outside-In Safety Blueprint uses external cameras and vision AI agents to extend awareness beyond onboard sensors and support facility-level monitoring and functional safety use cases.
Across both AV and robotics, the NVIDIA Halos AI Systems Inspection Lab turns safety, cybersecurity and AI safety requirements into repeatable inspections and helps prepare Halos integrations for final system-level certification by third-party agencies.
Who Is Building With the NVIDIA Halos Safety Ecosystem?
NVIDIA Halos connects the companies that build, integrate, assess and deploy physical AI solutions, including product developers, software and embedded-system providers, sensor and silicon companies, safety solution developers and certification bodies.
In autonomous vehicles, Geely, Isuzu, Nissan (powered by Wayve software) and Einride are building level 4-ready vehicles on NVIDIA Hyperion, supported by Halos OS.
Uber, Grab, Lyft and other mobility providers are also using Hyperion to scale robotaxi development and deployment. Members of the NVIDIA Halos AI Systems Inspection Lab include AUMOVIO, Bosch, Gatik, Hesai, Lucid, MIRA, onsemi, PlusAI, Sony, Valeo and Wayve, spanning autonomous-driving development, ADAS, sensors, silicon, systems integration, validation and safety assurance.
In robotics, acontis and QNX provide the embedded software needed to run safety functions predictably, while Advantech and NexCOBOT build safety-designed NVIDIA IGX systems. Infineon, NXP, STMicroelectronics and Texas Instruments contribute sensor, safety-microcontroller and other semiconductor technologies. KION Group is developing functional safety agents for autonomous forklifts. Agility is integrating NVIDIA IGX Thor and Halos Core into the safety system for its Digit 5 humanoid.
How Is NVIDIA Halos Independently Assessed?
For AVs, TÜV SÜD certified NVIDIA’s Automotive Product Lifecycle software process and DriveOS 6.0 to ISO 26262 ASIL D, as well as NVIDIA’s automotive engineering processes to ISO/SAE 21434. TÜV Rheinland also performed an independent UNECE safety assessment of NVIDIA DRIVE AV.
For robotics, TÜV Rheinland is inspecting NVIDIA IGX Thor, Halos OS and Holoscan Sensor Bridge for functional-safety certification readiness, building on TÜV SÜD’s inspection of the Thor SoC and Halos Core for ISO 26262.
Across physical AI, ANAB has accredited the NVIDIA Halos AI Systems Inspection Lab as an ISO/IEC 17020 inspection body. The lab inspects scoped Halos integrations and helps companies prepare for final certification by independent third-party bodies.
The companies that scale physical AI will not simply build the most capable systems. They will build systems that can be assessed, certified, deployed and trusted in the real world. Designing functional safety from the start is what separates a prototype from a scalable solution.
Learn more about NVIDIA Halos for AVs and robotics, and explore the full-stack safety architecture for physical AI.
