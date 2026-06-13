---
id: social-intelligence/reddit-deep/datascience/1lkpnkk.md
url: "https://www.reddit.com/r/datascience/comments/1lkpnkk/preexpedition_weather_conditions_and_success/"
kind: "social-post"
source: "reddit-deep: r/datascience"
subreddit: "datascience"
title: "Pre-Expedition Weather Conditions and Success Rates: Seasonal Pattern Analysis of Himalayan Expedition Data"
author: "bonesclarke84"
date: "2025-06-26T03:17:02.000Z"
score: 13
upvote_ratio: 0.94
num_comments: 10
flair: "Analysis"
extracted_at: "2026-06-11T18:58:19.182Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/datascience/1lkpnkk.md#c0"
    char_span: [0, 2365]
    sentence_count: 8
    key_terms: [expedition, weather, pre-expedition, success, termination, data, either, summit]
    token_count: 506
  - id: "social-intelligence/reddit-deep/datascience/1lkpnkk.md#c1"
    char_span: [2367, 3225]
    sentence_count: 4
    key_terms: [png, a6925405bc7b5a9930fa9265adc3f425129579d8, attributes, diagram, failure, preview, success, format]
    token_count: 237
  - id: "social-intelligence/reddit-deep/datascience/1lkpnkk.md#c2"
    char_span: [3240, 5058]
    sentence_count: 7
    key_terms: [temperature, mission-balance-4250, pressure, weather, budget-puppy, routefinding, depending, crevasse]
    section: Comments
    token_count: 408
  - id: "social-intelligence/reddit-deep/datascience/1lkpnkk.md#c3"
    char_span: [5060, 6681]
    sentence_count: 9
    key_terms: [feature, success, "don't", like, risk, wind, formation, decision]
    section: Comments
    token_count: 346
  - id: "social-intelligence/reddit-deep/datascience/1lkpnkk.md#c4"
    char_span: [6683, 8527]
    sentence_count: 13
    key_terms: [wind, weather, slabs, data, humidity, specific, perhaps, easier]
    section: Comments
    token_count: 396
---
# Pre-Expedition Weather Conditions and Success Rates: Seasonal Pattern Analysis of Himalayan Expedition Data

Source: [reddit-deep: r/datascience](https://www.reddit.com/r/datascience/comments/1lkpnkk/preexpedition_weather_conditions_and_success/)
Posted by **bonesclarke84** · **13↑** · **10 comments**

After someone posted Himalayan expedition data on Kaggle: [Himalayan Expeditions](https://www.kaggle.com/datasets/siddharth0935/himalayan-expeditions), I decided to start a personal project and expand on this data by adding ERA5 historical reanalysis weather data to it. Some of my preliminary findings have been interesting so far and I thought I would share them.  
  
I expanded on the expedition data by creating multiple different weather windows:

* Full expedition from basecamp date until termination either following summit or termination of attempt.
* Pre-expedition weather - 14 days prior to official expedition start at basecamp.
* Termination or Summit approach - the day before termination or summit.
* Early phase - the first 14 days at basecamp.
* Late phase - 7 days prior to termination date (either after summit or on failed attempt.)
* Decision window - 2 days prior to summit window

The first weather that I have focused on analyzing is the pre-expedition weather window. After cleaning the data and adding the weather windows, I also added a few other features using simple operations and created a few target variables for later modelling like expedition success score, expedition failure score, and an overall expedition score. For this analysis, though, I only focused on success being either True or False. After creating the features and targets, I then ran t-tests on success being True or False to determine their statistical significance. 

When looking at all the features related to the pre-expedition weather window, the findings seem to suggest that pre-expedition weather conditions play a significant role in Himalayan expedition success or failure in spring/summer expeditions. The graphs and correlation heatmap below summarize the variables that have the highest significance in either success or failure:  


[This diagram shows how the different attributes either contribute to success or failure.](https://preview.redd.it/6nbr99uzu69f1.png?width=1904&format=png&auto=webp&s=f84e3cb76b2d61d3b3e68dc3fdd0eec2608cd586)

[This diagram highlights the key attributes over or under of a significance of 0.2 or -0.2 respectively. ](https://preview.redd.it/bzj3uxu2v69f1.png?width=1889&format=png&auto=webp&s=5287852c5a90ae75b251826e1a9668db0ca34d80)

[This is a correlation heatmap diagram associating the attributes to success or failure.](https://preview.redd.it/dd5g6ly4v69f1.png?width=1904&format=png&auto=webp&s=a6925405bc7b5a9930fa9265adc3f425129579d8)

Although these findings alone do not paint an over-all picture of Himalayan expedition success or failure, I believe they play a significant part and could be used practically to assess conditions going into spring/summer expeditions. 

I hope this is interesting and feel free to provide any feedback. I am not a data scientist by professional and still learning. This analysis was done in Python using a jupyter notebook.

## Comments

- **Mission-Balance-4250** (3↑): Curious if someone can explain the polarity of pressure related metrics between the two seasonal groups? Obviously its correlated w temperature. I'm guessing there's some ideal "absolute" temperature at which level the ice isn't melting and becoming slippery, but it's also not too cold. Then success tends towards this state?
  - **Budget-Puppy** (2↑): my guess is that it has to do with crevasse formation and routefinding prior to expedition start. If high pressure in the summer means hot, clear skies then depending on the snowpack and the route it can lead to tough routefinding as you have to navigate around more crevasses and crevasse danger just gets worse in general. 

If high pressure in the winter means cold, clear, dry weather then it can create ideal climbing conditions because new/soft snow firms up nicely during the night so it can mean the difference between trying to make steps in waist-deep snow vs cramponing happily on firm, solid ground.
    - **Mission-Balance-4250** (2↑): That is a much more precise and insightful elaboration - makes sense to me in my ignorance of not being a mountain climber lol
  - **bonesclarke84** (1↑): That's a good question and I don't know the answer, but the data suggests that it could actually be an function of temperature and humidity and not temperature alone.
  - **Helpful_ruben** (1↑): u/Mission-Balance-4250 Temperature inversely correlates with pressure, so higher temps lead to lower pressure, and visa versa, affecting winter-summer performance.
- **Budget-Puppy** (2↑): Were you able to get weather/location data along the routes? Mountains make their own weather, and the weather can be vastly different depending on which side of the mountain you're on (i.e. north face vs south face) and at various elevations.

As far as the features go, a lot of them just confirm what I already know but then there's a few surprises. The wind slab formation risk factor is confusing to me. Wind slabs form from high winds and fresh snow, followed by consolidation over a period of time and then weakening. I don't know why a high risk would be associated with success. And then humidity std dev and variance I don't know how to interpret those - it means there's big swings in humidity over the past N days and I don't know why that would be a helpful thing in general unless it's related to new snow getting dumped over the route and solidifying nicely overnight.

Edit: For temps, it'd be more important to understand how long it was below freezing, in addition to the temperature reading itself
  - **Budget-Puppy** (2↑): and then finally, my suggestion for improvement is to try to take this a step further and see if you can do some feature selection and feature engineering (with an emphasis on the data during the decision window) and fit a logistic regression model to see if you can get a success prediction model. The idea being that as a decision-maker who has to go make the go/no-go call prior to the summit push, I'd like to have an idea of the probability of success if we make the push under certain weather scenarios
    - **bonesclarke84** (1↑): Yes, this is the plan and have created a bunch of interactions so far that are interesting. As you have suggested, I have compared things like decision window versus pre-exped and full exped, and things like that. The wind slab formation risk is actually a feature I created as well.

In terms of a model, I am actually struggling a bit as my models (XGBoost and Keras) keep coming back with a standard ~69% which is really just the ratio of successfull vs failed expeditions. I am trying some techniques to readjust the class weights but I am thinking I actually need to use a more robust target that isn't simple binary.
  - **bonesclarke84** (1↑): There are some limitations with the precision of the weather data so no, I don't have route specific weather. The weather is as close as it gets to the summit in terms of coordinates used. That said, the data can be used to infere conditions on specific sides of a mountain by looking at wind direction and stability, and things of that nature. You could also calculate the predicted sun exposure too, using a sun model but that would be more than what I am willing to put in at this point, haha.

The potential explaination for your second question is perhaps that the humidity destabilizes the wind slabs but when it's very cold, the wind slabs actually bond together, maybe? That is my interpretation anyways. The fluctuation of the humidity is the risk perhaps, not the actual formations of the wind slabs. 

Good questions/thoughts, though!
- **Forsaken-Stuff-4053** (1↑): Really impressive work—especially layering in ERA5 reanalysis data and creating multiple time-window features. This is the kind of structured, exploratory analysis that’s both technically solid and practically valuable.

If you’re planning to build out the project into a full report or make it easier to share, a tool like [kivo.dev](https://kivo.dev) might help. You can upload your notebook outputs, CSVs, or even graphs and use natural language to generate visual summaries and written insights. Makes it easier to present your findings without getting bogged down formatting everything manually.
