---
id: articles/amazon-science/39cd4dfd7c.md
url: "https://www.amazon.science/blog/how-flat-is-replacing-fat-in-aws-data-center-networks"
url_hash: "39cd4dfd7c"
kind: "article"
source: "amazon_science"
title: "How flat is replacing fat in AWS data center networks"
author: ""
date: "Thu, 28 May 2026 10:30:00 GMT"
tier: 2
method: "source-native"
extracted_at: "2026-10-09T16:53:11.369966+00:00"
chars: 7726
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
collected_at: "2026-10-09T16:53:08.315Z"
relevance: 5
engagement_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
content_hash: "2eaff3b0424d4525"
relevance_by_goal: {"5a163910d68e":0,"aa6916010743":5}
chunks:
  - id: "articles/amazon-science/39cd4dfd7c.md#c0"
    char_span: [0, 168]
    sentence_count: 1
    key_terms: [how-flat-is-replacing-fat-in-aws-data-center-networks, replacing, networks, science, amazon, center, source, https]
    token_count: 40
    sources: [{"n":"amazon_science","u":"https://www.amazon.science/blog/how-flat-is-replacing-fat-in-aws-data-center-networks","kind":"article","date":"2026-05-28"}]
  - id: "articles/amazon-science/39cd4dfd7c.md#c1"
    char_span: [170, 2824]
    sentence_count: 19
    key_terms: [network, routers, random, router, data, tree, randomly, centers]
    concepts: [network, routers, random, router, randomly]
    related_chunks: ["articles/amazon-science/39cd4dfd7c.md#c2", "articles/amazon-science/39cd4dfd7c.md#c3"]
    token_count: 512
    sources: [{"n":"amazon_science","u":"https://www.amazon.science/blog/how-flat-is-replacing-fat-in-aws-data-center-networks","kind":"article","date":"2026-05-28"}]
  - id: "articles/amazon-science/39cd4dfd7c.md#c2"
    char_span: [2456, 5177]
    sentence_count: 25
    key_terms: [routers, routing, destination, traffic, random, quasi-random, paths, structure]
    concepts: [routers, routing, destination, traffic, random]
    related_chunks: ["articles/amazon-science/39cd4dfd7c.md#c1"]
    token_count: 512
    sources: [{"n":"amazon_science","u":"https://www.amazon.science/blog/how-flat-is-replacing-fat-in-aws-data-center-networks","kind":"article","date":"2026-05-28"}]
  - id: "articles/amazon-science/39cd4dfd7c.md#c3"
    char_span: [4838, 7679]
    sentence_count: 25
    key_terms: [quasi-random, performance, topology, network, routers, models, production, new]
    concepts: [quasi-random, performance, topology, network, routers]
    related_chunks: ["articles/amazon-science/39cd4dfd7c.md#c1"]
    token_count: 512
    sources: [{"n":"amazon_science","u":"https://www.amazon.science/blog/how-flat-is-replacing-fat-in-aws-data-center-networks","kind":"article","date":"2026-05-28"}]
  - id: "articles/amazon-science/39cd4dfd7c.md#c4"
    char_span: [7313, 7897]
    sentence_count: 5
    key_terms: [latency-sensitive, infrastructure, transparently, applications, architecture, quasi-random, operational, operations]
    token_count: 103
    sources: [{"n":"amazon_science","u":"https://www.amazon.science/blog/how-flat-is-replacing-fat-in-aws-data-center-networks","kind":"article","date":"2026-05-28"}]
---
# How flat is replacing fat in AWS data center networks

Source: [amazon_science](https://www.amazon.science/blog/how-flat-is-replacing-fat-in-aws-data-center-networks)

Routing in today’s data centers is usually governed by a data structure called a “fat tree”, which is similar to a corporate organizational chart, with nodes in each layer connecting to multiple nodes in the layer below. Here, however, the nodes of the bottom layer represent routers that want to send messages to each other, and the layers above them contain extra routers that simplify the routing procedure. A message sent by one bottom-layer router climbs the tree until it reaches the branch that leads to the destination router, and then it is sent down.
This design is easy to implement but inefficient: the extra layers of routers add overhead, and routers at the top of the tree are prone to congestion. The fat-tree structure is also fragile, since the loss of a single router can cut off large regions of the tree.
Theoretically, the best alternative is a “flat” network, in which the routers connect directly to each other. Ideally, one should connect the routers randomly, to maximize the diversity of routes through the network. But this is impractical, because calculating ad hoc paths through a random network is computationally intensive, and randomly connecting routers leads to data centers criss-crossed with wires.
In a paper we recently posted to arXiv, we describe the first ever scalable flat-network datacenter. We introduce a “quasi-random” network topology that preserves many of the benefits of random connection and a passive optical component we call a ShuffleBox, which makes it practical to cable a flat network. The resulting network design — which we call RNG, for resilient network graphs — is now used in AWS data centers and is the default for most new builds globally. It uses 69% fewer routers, delivers up to 33% better throughput, and projects a 40% reduction in network equipment electricity consumption.
The secret of randomness
In the early 1990s, mathematicians showed that the optimal network for routing has a random topology, in which each router simply connects randomly to a few others. This is quite counterintuitive, but the overall network ends up having lots of different paths between all pairs of routers. Random networks also demonstrate excellent resilience, since no single router is more important than any other. The loss of 1% of routers results in a roughly 1% capacity loss. Degradation is proportional and predictable rather than catastrophic and concentrated.
Networking researchers have also validated these results through simulations, showing that random, flat topologies achieve better performance than the corresponding fat trees.
But these results couldn’t make it in the real world. Any network design comes with a “routing protocol” that decides how packets reach their destinations. In a random network, computing and implementing the right set of routing paths can take a lot of hardware resources — well beyond what is present in commodity routers. On the other hand, using dedicated hardware for routing would be cost prohibitive. An even bigger problem is that cabling routers randomly in a datacenter is completely infeasible.
Our solution is to build a “quasi-random” network topology that has exactly the right mix of random and deterministic components.
Routing without structure
In a fat tree, the hierarchy itself tells packets where to go. And the paths generated are guaranteed to be the shortest possible. In a quasi-random graph, there is no obvious structure to exploit. Standard approaches to multipath routing in flat topologies typically require 20 to 80 times more memory than commodity hardware is equipped with.
Our key insight is that we can exploit the random structure of the topology to open up a wide range of path options in a lightweight manner.
Our routing algorithm, Spraypoint, has two components. The source router “sprays” its traffic randomly to all of its neighbors. Every (destination) router has some designated “waypoints” that feed traffic to it. The main scheme is that each data packet sent from the source goes to a random neighbor, after which the classic shortest-path algorithm routes it to a waypoint, and the waypoints feed it to the destination. The utility of spraying is that traffic can take a wide variety of paths to the destination, while the waypoints prevent traffic from congesting near the destination. In the implementation, we create various “rings” around each destination, and traffic is guided from each ring to a closer ring.
By spraying to neighbors, Spraypoint provides nearly twice as many independent paths between routers as standard shortest-path routing techniques. This improves the likelihood that traffic will be routed around congested pathways or failed routers.
Making quasi-random cabling practical
A random graph connects arbitrary pairs of routers that may sit in different rooms, hundreds of meters apart. This is the strength of the topology, since it allows for fast communication between routers. But that is also its drawback, since cabling such a structure is extremely complicated.
This is where our quasi-random solution comes in. Instead of all connections being random, we fix specific parts of the network topology. Our central innovation is a passive optical device called a ShuffleBox. It has router-facing ports on one side and connects to other ShuffleBoxes on the other side. The internal wires are shuffled according to a special pattern, so that random connections between the ShuffleBoxes lead to an overall quasi-random topology.
When a new rack arrives, a technician plugs its router into an available port on the local ShuffleBox. No rewiring elsewhere. The physical-cabling complexity, the number of cable runs, and the installation process are on par with those of a fat tree, even though the logical topology is quasi-random.
Predicting performance before construction
With any new network topology, operators need confidence that it will meet capacity and performance requirements before they commit to construction. Fat-tree topologies come with simple, well-defined models that predict performance and capacity constraints.
No equivalent existed for quasi-random graphs. We developed new mathematical models for various network statistics, such as path lengths, the number of routes, and how much traffic will end up on a particular link. These models give precise formulas that network operators can use to choose design parameters. We validated those models extensively, using 530 processor-years of simulation, the equivalent of running a single CPU for half a millennium, executed on Amazon EC2.
An operator can now specify a server count and a target performance level, compute the cheapest compliant topology, and be confident that it will work.
From theory to production
The first quasi-random network went live near Dublin, Ireland, at the end of 2024, carrying real production traffic. We validated performance against the mathematical predictions, identified operational refinements, and applied them in two additional deployments. In end-to-end benchmarks across these production fabrics, our flat topology matched fat-tree performance for multipath-transport workloads and latency-sensitive storage operations. No customer workload changes were required, and the network operates transparently beneath existing applications.
By April 2026, quasi-random wiring became the default architecture for most new AWS data centers globally. The 69% reduction in the number of routers translates directly into reduced power, cooling, and operational overhead at every site. For customers, it means more resilient infrastructure behind every API call, database query, and machine learning training job, without changing a single line of code.
