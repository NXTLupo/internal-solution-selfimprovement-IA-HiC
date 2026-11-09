---
id: articles/nvidia-developer/dbc6d2eb02.md
url: "https://developer.nvidia.com/blog/integrate-nvidia-omniverse-rtx-sensor-simulation-into-existing-apps/"
url_hash: "dbc6d2eb02"
kind: "article"
source: "NVIDIA Developer"
title: "Integrate NVIDIA Omniverse RTX Sensor Simulation Into Existing Apps"
author: ""
date: "2026-07-20T15:00:00Z"
tier: 2
method: "source-native"
extracted_at: "2026-08-26T19:18:02.510812+00:00"
chars: 10000
engagement: "deliver-a-technical-architecture-and-implementation-blueprin"
collected_at: "2026-08-26T19:18:02.175Z"
relevance: 10
engagement_goal: "Deliver a technical architecture and implementation blueprint for Deciem's marketing and design teams to automate the email production workflow from Figma design to validated, sendable HTML using a multi-agent AI system, specifying agent roles, skills, and Model Context Protocol configurations that connect Figma libraries, brand guidelines, and design patterns while preserving creative flexibility and brand compliance, based on state of the art evidence current as of August 2026 and no earlier than January 2026. Define the reusable email component approach (including MJML), sending-platform and personalization-token integration, and the QA and validation criteria that qualify automated output as sendable."
content_hash: "c8c090ca2fc262c0"
relevance_by_goal: {"d21cb50b17ba":10}
chunks:
  - id: "articles/nvidia-developer/dbc6d2eb02.md#c0"
    char_span: [0, 201]
    sentence_count: 1
    key_terms: [integrate-nvidia-omniverse-rtx-sensor-simulation-into-existing-apps, nvidia, developer, simulation, integrate, omniverse, existing, sensor]
    concepts: [nvidia, developer]
    token_count: 49
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/integrate-nvidia-omniverse-rtx-sensor-simulation-into-existing-apps/","kind":"article","date":"2026-07-20"}]
  - id: "articles/nvidia-developer/dbc6d2eb02.md#c1"
    char_span: [203, 3002]
    sentence_count: 15
    key_terms: [libraries, omniverse, capabilities, simulation, workflows, application, openusd, developers]
    concepts: [libraries, omniverse, capabilities, simulation, workflows]
    related_chunks: ["articles/nvidia-developer/dbc6d2eb02.md#c3"]
    token_count: 512
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/integrate-nvidia-omniverse-rtx-sensor-simulation-into-existing-apps/","kind":"article","date":"2026-07-20"}]
  - id: "articles/nvidia-developer/dbc6d2eb02.md#c2"
    char_span: [2661, 5240]
    sentence_count: 12
    key_terms: [application, simulation, sensor, ovrtx, outputs, renderer, workflow, omniverse]
    concepts: [application, simulation, sensor, outputs, ovrtx]
    related_chunks: ["articles/nvidia-developer/dbc6d2eb02.md#c3", "articles/nvidia-developer/dbc6d2eb02.md#c4", "articles/nvidia-developer/dbc6d2eb02.md#c5"]
    token_count: 512
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/integrate-nvidia-omniverse-rtx-sensor-simulation-into-existing-apps/","kind":"article","date":"2026-07-20"}]
  - id: "articles/nvidia-developer/dbc6d2eb02.md#c3"
    char_span: [4941, 7431]
    sentence_count: 13
    key_terms: [omniverse, ovrtx, openusd, simulation, renderer, outputs, rtx, nvidia]
    concepts: [omniverse, simulation, openusd, ovrtx, renderer]
    related_chunks: ["articles/nvidia-developer/dbc6d2eb02.md#c1", "articles/nvidia-developer/dbc6d2eb02.md#c2", "articles/nvidia-developer/dbc6d2eb02.md#c4", "articles/nvidia-developer/dbc6d2eb02.md#c5"]
    token_count: 512
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/integrate-nvidia-omniverse-rtx-sensor-simulation-into-existing-apps/","kind":"article","date":"2026-07-20"}]
  - id: "articles/nvidia-developer/dbc6d2eb02.md#c4"
    char_span: [7091, 9609]
    sentence_count: 12
    key_terms: [renderer, renderproducts, rendervars, outputs, ovrtx, sensor, content, openusd]
    concepts: [renderer, renderproducts, rendervars, outputs, ovrtx]
    related_chunks: ["articles/nvidia-developer/dbc6d2eb02.md#c2", "articles/nvidia-developer/dbc6d2eb02.md#c3"]
    token_count: 512
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/integrate-nvidia-omniverse-rtx-sensor-simulation-into-existing-apps/","kind":"article","date":"2026-07-20"}]
  - id: "articles/nvidia-developer/dbc6d2eb02.md#c5"
    char_span: [9318, 10204]
    sentence_count: 6
    key_terms: [sensor, simulation, camera, renderproduct, ovrtx, rendering, outputs, lidar]
    concepts: [sensor, simulation, renderproduct, camera, ovrtx]
    related_chunks: ["articles/nvidia-developer/dbc6d2eb02.md#c2", "articles/nvidia-developer/dbc6d2eb02.md#c3"]
    token_count: 190
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/integrate-nvidia-omniverse-rtx-sensor-simulation-into-existing-apps/","kind":"article","date":"2026-07-20"}]
---
# Integrate NVIDIA Omniverse RTX Sensor Simulation Into Existing Apps

Source: [NVIDIA Developer](https://developer.nvidia.com/blog/integrate-nvidia-omniverse-rtx-sensor-simulation-into-existing-apps/)

Developers building 3D, design, simulation, robotics, and industrial digital twin applications need ways to bring physical AI capabilities into the tools and services they already use. Many of these workflows already depend on OpenUSD scenes, simulation-ready (SimReady) assets, Blender-based workflows, CAD pipelines, or domain-specific app stacks. The challenge is how to provide applications and AI agents with callable tools to inspect scenes, generate sensor outputs, test changes, and return evidence developers can trust.
NVIDIA Omniverse libraries, now part of NVIDIA Agent Toolkit, provide modular building blocks for adding these capabilities into existing applications. ovrtx is the RTX sensor simulation library in that stack, now available as prerelease software on GitHub. It provides developers with a lightweight C and Python SDK for generating camera, lidar, radar, and related sensor outputs from OpenUSD content while keeping control inside the host application.
Within the Omniverse libraries stack, ovstage provides a shared runtime stage for OpenUSD scene data, enabling libraries such as ovphysx and ovrtx to exchange simulation state, scene changes, and prim identities through a common data substrate.
This post walks through how ovrtx integrates into existing workflows as part of the Omniverse libraries model. Steps include loading OpenUSD content, configuring render and sensor outputs, stepping from an application loop, reading results back into the app, and applying the same model in a PTC Onshape Render Studio example and a SimReady Blender sample workflow.
How do NVIDIA Omniverse libraries help application developers?
Simulation and rendering are becoming part of the application layer for a wide range of workflows including design, robotics, autonomous vehicles (AVs), industrial digital twins, and physical AI.
Developers and teams need to visualize OpenUSD scenes, generate physically grounded data, test perception systems, validate behavior, and view results inside the tools they use.
These include CAD systems, Blender-based workflows, PLM or PDM workflows, OpenUSD asset pipelines, internal simulation stacks, and domain-specific applications.
A previous post, Integrate Physical AI Capabilities into Existing Apps with NVIDIA Omniverse Libraries, introduces a library-first approach for adding Omniverse capabilities to existing application stacks. That post covers how standalone libraries can expose sensors, physics, and storage capabilities through focused APIs, giving teams more control over where those capabilities run in their own tools and services. ovrtx applies that approach specifically to Omniverse RTX sensor simulation and visualization.
As announced at SIGGRAPH 2026, NVIDIA Agent Toolkit now includes Omniverse libraries, with ovrtx serving as the RTX sensor simulation layer. It helps applications and agents generate camera, lidar, radar, semantic segmentation, and visual preflight outputs from OpenUSD scenes. Used with other Omniverse libraries, it becomes part of a tool-driven workflow for preparing and validating simulation-ready 3D content.
That application control matters whenever sensor simulation needs to fit inside an existing workflow. For physical AI teams, those outputs can support synthetic data generation (SDG), perception testing, robotics workflows, simulation-ready digital twins, and design review.
With ovrtx now available as pre-release software on GitHub, you can inspect the C and Python APIs, run the examples, test OpenUSD scene loading, and evaluate how RTX sensor outputs fit into your own application loop.
How to integrate ovrtx into existing workflows
The core principle behind ovrtx is straightforward. As a developer, you can bring NVIDIA Omniverse RTX sensor simulation into your own applications while maintaining control of the application architecture, UI, data model, and workflow. The lightweight C and Python SDK is designed for projects that need a real-time 3D viewport, RTX rendering, or sensor simulation, including camera, lidar, radar, ultrasonic, and related outputs.
A typical integration follows five steps:
- Create and configure an ovrtx renderer.
- Load or reference OpenUSD content from the application’s existing pipeline.
- Define RenderProducts and RenderVars for the camera, lidar, radar, semantic segmentation, or rendered outputs the workflow needs.
- Step rendering or sensor simulation from the application loop.
- Map the results back to CPU or GPU memory so the app can display, save, analyze, or pass them to another process.
A pseudo-code example is shown below—the host application owns the workflow.
renderer = ovrtx.Renderer()
renderer.open_usd(app_scene_or_usd_layer)
render_products = {"/Render/Camera"}  # Add lidar, radar, or other outputs as needed.
while app.is_running():
    app.update_scene_state()
    products = renderer.step(
        render_products=render_products,
        delta_time=app.frame_delta_seconds,
    )
    for product in products.values():
        for frame in product.frames:
            color = frame.render_vars["LdrColor"].map(device=ovrtx.Device.CPU)
            app.use_render_output(color)
Control remains in the host application. The app owns the loop; ovrtx produces the requested render or sensor outputs; and the results return to the workflow for display, storage, analysis, or downstream processing.
Core components in the ovrtx integration flow
The host application uses a few core pieces when it calls ovrtx: the Omniverse RTX renderer, an OpenUSD stage, and RenderProducts and RenderVars that define the outputs to generate.
Omniverse RTX Renderer
Omniverse RTX Renderer is the core technology exposed by the ovrtx library. It takes advantage of NVIDIA RTX, combining “on chip” RT Cores in NVIDIA RTX GPUs with AI acceleration enabled by Tensor Cores. NVIDIA Omniverse RTX enables real-time, physically-based rendering and simulation of light transport in 3D environments, using flexible physically-based lighting and materials to model cameras, lidar, radar and related sensor outputs.
ovstage
ovstage is the shared runtime stage for Omniverse libraries. It provides C and Python APIs for reading, writing, querying, and managing OpenUSD scene data such as transforms, materials, hierarchy, metadata, and simulation state across CPU and GPU memory. In a multilibrary workflow, ovstage allows ovphysx to write updated simulation states and ovrtx to read changed scene data for sensor simulation—without each library maintaining a separate scene representation.
OpenUSD
NVIDIA has adopted OpenUSD as the foundational data layer for NVIDIA Omniverse and simulation workflows. OpenUSD defines a standard data representation for 3D scenes and provides C++ and Python APIs to read and write those scenes. Data in OpenUSD is organized into a scene graph that ovrtx can render. USD stages can define and handle complex geometry, photometric lights, OpenPBR materials, cameras, and other sensors.
RenderProducts and RenderVars
RenderProducts and RenderVars provide a USD-native way to define the outputs to obtain from a renderer or sensor simulator.They provide a lot of flexibility to specify output types, resolutions, formats and other parameters. A RenderProduct is associated with one or more sensors, and ovrtx generates the outputs defined by the RenderVars associated with it. RenderProducts and RenderVars can be defined programmatically and stored in the USD scene or defined at runtime using the ovrtx C or Python APIs.
Application flow
Think of ovrtx as an on-demand service your app calls when it needs to visualize an OpenUSD scene or generate render and sensor outputs. The first steps, creating a renderer, loading OpenUSD content, and configuring RenderProducts and RenderVars, usually happen once or infrequently. The final steps, stepping rendering or sensor simulation and reading outputs, typically run inside the application loop.
Create and configure an ovrtx renderer
Your existing app, whether Python, C, or C++, starts by creating a renderer instance and setting basic options it needs.
- Initialize ovrtx and construct a renderer object, pointing it to the correct GPUs and any global configuration options.
- If you have multiple views or sensors, you still have a single renderer instance coordinating them. Multiple RenderProducts will be attached later.
renderer = ovrtx.Renderer()
Load or reference OpenUSD content
Next, the renderer needs to know which USD stage to draw from.
- Point the renderer at an OpenUSD file or URL with open_usd, load USDA directly from a string with open_usd_from_string, or compose additional referenced content withadd_usd_reference.
- If your app already has an Omniverse or USD pipeline, ovrtx can read that OpenUSD content directly instead of requiring the app to rebuild the scene in another format.
renderer.open_usd("warehouse_scene.usd")
# or compose additional content into the stage:
# renderer.add_usd_reference("extra_props.usd", prefix="/World/Props")
Configure render and sensor outputs
With a renderer and stage in place, the app displays which outputs it needs.
Define RenderProducts
- Example: An RGB camera on a robot, a top‑down surveillance camera, a spinning lidar sensor on a vehicle.
- Each RenderProduct is tied to a camera or sensor prim path in the USD stage and a resolution.
Attach RenderVars. For each RenderProduct, specify which outputs ovrtx should generate. Examples include:
- Color, such as LdrColor or HdrColor
- Depth or distance
- Surface normals
- Semantic segmentation
- Lidar point clouds
- Radar detections
- Other sensor‑specific tensors
Step rendering or sensor simulation from the application loop
The app calls ovrtx from its main loop, which may already manage physics, animation, user input, networking, or other simulation state.
After the app updates the OpenUSD stage, it advances rendering or sensor simulation by passing a time increment. ovrtx then generates the requested outputs for the configured RenderP
