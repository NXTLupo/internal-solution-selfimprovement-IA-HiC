---
id: articles/deepmind-blog/d4d97cea3d.md
url: "https://deepmind.google/blog/how-ai-is-helping-advance-the-science-of-bioacoustics-to-save-endangered-species/"
url_hash: "d4d97cea3d"
kind: "article"
source: "DeepMind Blog"
title: "How AI is helping advance the science of bioacoustics to save endangered species"
author: ""
date: "Fri, 24 Oct 2025 02:30:54 +0000"
tier: 2
method: "pack-search-backfill"
extracted_at: "2026-07-02T18:14:01.205828+00:00"
chars: 4827
engagement: "deliver-a-comprehensive-2026-risk-and-market-analysis-for-th"
collected_at: "2026-07-02T18:13:59+00:00"
content_hash: "301a4a3519543a2d"
chunks:
  - id: "articles/deepmind-blog/d4d97cea3d.md#c0"
    char_span: [0, 220]
    sentence_count: 1
    key_terms: [how-ai-is-helping-advance-the-science-of-bioacoustics-to-save-endangered-species, deepmind, blog, bioacoustics, endangered, advance, helping, science]
    concepts: [deepmind]
    token_count: 56
    sources: [{"n":"DeepMind Blog","u":"https://deepmind.google/blog/how-ai-is-helping-advance-the-science-of-bioacoustics-to-save-endangered-species/"}]
  - id: "articles/deepmind-blog/d4d97cea3d.md#c1"
    char_span: [222, 2759]
    sentence_count: 16
    key_terms: [perch, model, new, protect, species, data, conservationists, animals]
    concepts: [perch, model, protect, species, conservationists]
    related_chunks: ["articles/deepmind-blog/d4d97cea3d.md#c2"]
    token_count: 512
  - id: "articles/deepmind-blog/d4d97cea3d.md#c2"
    char_span: [2445, 4941]
    sentence_count: 15
    key_terms: [perch, monitor, bioacoustics, search, species, sounds, honeycreeper, model]
    concepts: [perch, bioacoustics, monitor, search, species]
    related_chunks: ["articles/deepmind-blog/d4d97cea3d.md#c1"]
    token_count: 512
  - id: "articles/deepmind-blog/d4d97cea3d.md#c3"
    char_span: [4688, 5050]
    sentence_count: 3
    key_terms: [collaborators, ornithology, university, research, thousand, another, birdnet, cornell]
    concepts: [collaborators]
    token_count: 84
---
# How AI is helping advance the science of bioacoustics to save endangered species

Source: [DeepMind Blog](https://deepmind.google/blog/how-ai-is-helping-advance-the-science-of-bioacoustics-to-save-endangered-species/)

How AI is helping advance the science of bioacoustics to save endangered species
Our new Perch model helps conservationists analyze audio faster to protect endangered species, from Hawaiian honeycreepers to coral reefs.
One of the ways scientists protect the health of our planet’s wild ecosystems is by using microphones (or underwater hydrophones) to collect vast amounts of audio dense with vocalizations from birds, frogs, insects, whales, fish and more. These recordings can tell us a lot about the animals present in a given area, along with other clues about the health of that ecosystem. Making sense of so much data, however, remains a massive undertaking.
Today, we are releasing an update to Perch, our AI model designed to help conservationists analyze bioacoustic data. This new model has better state-of-the-art off-the-shelf bird species predictions than the previous model. It can better adapt to new environments, particularly underwater ones like coral reefs. It’s trained on a wider range of animals, including mammals, amphibians and anthropogenic noise — nearly twice as much data in all, from public sources like Xeno-Canto and iNaturalist. It can disentangle complex acoustic scenes over thousands or even millions of hours of audio data. And it’s versatile, able to help answer many different kinds of questions, from “how many babies are being born” to “how many individual animals are present in a given area.”
In order to help scientists protect our planet’s ecosystems, we’re releasing this new version of Perch as an open model and making it available on Kaggle.
Success Stories: Perch in the Field
Since it was first launched in 2023, the initial version of Perch has already been downloaded over 250,000 times and its openly available solutions are now well-integrated into tools for working biologists. For example, Perch’s vector search library is now part of Cornell's widely-used BirdNet Analyzer.
In addition, Perch is helping BirdLife Australia and the Australian Acoustic Observatory build classifiers for a number of unique Australian species. For example, our tools enabled the discovery of a new population of the elusive Plains Wanderer.
Recent work has also found that the earlier version of Perch can be used to identify individual birds and track bird abundance, potentially reducing the need for catch-and-release studies to monitor populations.
Finally, biologists from the LOHE Bioacoustics Lab at the University of Hawaiʻi have used it to monitor and protect populations of honeycreepers, which are important to Hawaiian mythology and face extinction from the threat of avian malaria spread by non-native mosquitoes. Perch helped the LOHE Lab find honeycreeper sounds nearly 50x faster than their usual methods, enabling them to monitor more species of honeycreeper over greater areas. We expect the new model will further accelerate these efforts.
Untangling the Planet's Playlist
The Perch model can predict which species are present in a recording, but that's only part of the story: We also provide tools that allow scientists to quickly build new classifiers starting from a single example and monitor species for which there is scarce training data or for very specific sounds like juvenile calls. Given one example of a sound, vector search with Perch surfaces the most similar sounds in a dataset. A local expert can then mark the search results as relevant or irrelevant to train a classifier.
Together, this combination of vector search and active learning with a strong embedding model is called agile modeling. Our recent paper–"The Search for Squawk: Agile Modeling in Bioacoustics"–shows that this method works across birds and coral reefs, allowing the creation of high quality classifiers in under an hour.
Looking ahead: the future of bioacoustics
Together, our models and methods are helping maximize the impact of conservation efforts, leaving more time and resources for meaningful, on-the-ground work. From the forests of Hawaiʻi to the reefs of the ocean, the Perch project showcases the profound impact we can have when we apply our technical expertise to the world's most pressing challenges. Every classifier built and every hour of data analyzed brings us closer to a world where the soundtrack of our planet is one of rich, thriving biodiversity.
Learn more
Acknowledgements
This research was developed by the Perch team: Bart van Merriënboer, Jenny Hamer, Vincent Dumoulin, Lauren Harrell, and Tom Denton, and Otilia Stretcu from Google Research. We also thank our collaborators Amanda Navine and Pat Hart at the University of Hawaiʻi, and Holger Klinck, Stefan Kahl and the BirdNet team at the Cornell Lab of Ornithology. And all our friends and collaborators whom we would have written about in this blog post if only we had another thousand words.
