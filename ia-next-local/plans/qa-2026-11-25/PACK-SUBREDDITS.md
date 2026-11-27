# Subreddits crawled with every data pack (26 Nov 2026)

Every deep research run in IA Next Local that uses a data pack searches that pack's subreddits below with the run's
keywords, inside the run's period, and keeps the posts most about the research goal with their top comments
(ia_next/packsocial.py). No listening task is needed first.

How each list was made (once, outside IA Next):

1. Market-research questions. For each pack, thirty questions a client team is most likely to ask about AI in that
   industry: adoption, jobs to be done, results, blockers, customer and staff sentiment, vendors and regulation
   (scripts/pack_market_queries.py).
2. HiC's Suggest from goal. Those questions were given as the research goal to HiC's subreddit recommender
   (services/subredditSuggester.ts: its own prompt, gemini-3.5-flash, through HiC's proxy), asked again with the
   names already returned excluded until it reached fifty or ran dry (scripts/suggest_pack_subreddits.py). Gemini
   was used only to write these lists; IA Next Local never calls it.
3. The pack's own feeds. The subreddits HiC already follows for the pack as RSS feeds were added (260 feeds across 13
   packs). Through RSS they returned about 1% of the time; here they are searched through Reddit's API instead.
4. Reddit's check. Every name was looked up with Reddit's API: it must exist, be public, not be marked adult or
   quarantined, and have at least 1,000 members (scripts/verify_pack_subreddits.py).

Result: 679 pack placements over 479 distinct subreddits.

| Pack | Questions | Subreddits crawled | Left out after Reddit's check |
|---|---|---|---|
| Advancement & Fundraising | 30 | 34 | 38 |
| Agriculture & Agribusiness | 30 | 29 | 10 |
| Energy & Utilities | 30 | 38 | 17 |
| Executive Search & Leadership Advisory | 30 | 31 | 43 |
| Financial Services | 30 | 38 | 12 |
| Government & Policy | 30 | 34 | 16 |
| Healthcare & Life Sciences | 30 | 43 | 15 |
| Higher Ed | 30 | 46 | 15 |
| Insurance | 30 | 37 | 19 |
| Retail & Commerce | 30 | 50 | 18 |
| Social Clubs & Membership Organizations | 30 | 27 | 18 |
| Travel, Tourism & Museums | 30 | 44 | 18 |
| Workforce & Careers | 30 | 50 | 15 |
| AI Trends | 30 | 41 | 9 |
| Academic & Analyst | 30 | 37 | 13 |
| Creative AI | 30 | 50 | 7 |
| Social Listening | 30 | 50 | 5 |

## Advancement & Fundraising

Audience: advancement, development and philanthropy teams at universities, hospitals and nonprofits.

### Market-research questions

1. How are university advancement offices using AI to identify major gift prospects?
2. Which AI tools do nonprofit development teams use for donor research and wealth screening?
3. How do donors feel about receiving AI-written appeals and thank-you letters?
4. Does AI-personalized outreach raise annual fund response and retention rates?
5. How are gift officers using AI assistants to prepare for donor meetings?
6. What do frontline fundraisers say AI saves them time on, and what it gets wrong?
7. How are CRMs such as Raiser's Edge, Salesforce Nonprofit and Blackbaud adding AI features?
8. What data privacy concerns do donors and alumni raise about AI use of their records?
9. How do small nonprofits with no data team adopt AI for fundraising?
10. How is AI used in grant writing, and how do funders react to AI-drafted proposals?
11. Which predictive models for lapsed donors and planned giving actually work?
12. How are alumni engagement teams using AI to segment and re-engage young alumni?
13. What ethical guidelines are fundraising associations publishing on AI?
14. How do prospect researchers view AI replacing parts of their job?
15. What does AI change in giving day and crowdfunding campaign management?
16. How are donor-advised fund platforms and giving apps using AI?
17. What are the biggest failures or embarrassments from AI in fundraising communications?
18. How do board members and trustees view AI investment in advancement?
19. How do development teams measure ROI on AI tools?
20. How is AI used for stewardship reports and impact storytelling to donors?
21. What skills are advancement offices hiring for as AI spreads?
22. How do Gen Z and millennial donors expect AI to shape how charities contact them?
23. How are hospitals and health foundations using AI in grateful patient programs?
24. What do fundraising consultants recommend about AI adoption roadmaps?
25. How are data hygiene and duplicate records handled with AI in advancement databases?
26. How does AI support event fundraising, auctions and peer-to-peer campaigns?
27. What are donors saying on social media about AI-generated charity content?
28. How are faith-based organizations approaching AI in giving and stewardship?
29. Which AI chatbots are nonprofits deploying for donor questions, and how do donors respond?
30. How is AI affecting trust and transparency in charitable giving?

### Subreddits crawled (34)

| Subreddit | Members | Named by | Why it is crawled |
|---|---|---|---|
| r/kickstarter | 107,308 | HiC Suggest from goal | Crowdfunding campaign managers discussing AI copy generation, backer analytics, and automated reward fulfillment. |
| r/nonprofit | 97,401 | HiC Suggest from goal and pack feed | Nonprofit professionals sharing tech adoption, donor communications, and operational software experiences. |
| r/EffectiveAltruism | 38,183 | HiC Suggest from goal and pack feed | Donors and fundraisers debating grantmaking transparency, donor trust, and AI ethics. |
| r/grants | 12,040 | HiC Suggest from goal | Grant writers and managers sharing experiences with AI proposal drafting and funder guidelines |
| r/studentaffairs | 9,931 | HiC Suggest from goal | University staff and administrators discussing higher ed operations, campus technology, and alumni engagement |
| r/Indiegogo | 7,355 | HiC Suggest from goal | Peer-to-peer and reward crowdfunding creators comparing AI marketing tools and campaign analytics performance. |
| r/salesforceadmin | 6,125 | HiC Suggest from goal | CRM administrators implementing Salesforce Nonprofit Cloud AI tools, data hygiene, and donor tracking |
| r/pastors | 5,482 | HiC Suggest from goal | Faith-based leaders discussing congregational tithing platforms, digital stewardship, and AI-assisted fundraising communications. |
| r/grantwriting | 2,070 | HiC Suggest from goal | Grant writers discussing AI proposal drafting, funder reactions, and efficiency tools. |
| r/personalfinance | 21,906,189 | pack feed | followed by the pack as a feed in HiC |
| r/sustainability | 914,725 | pack feed | followed by the pack as a feed in HiC |
| r/ethicalfashion | 121,445 | pack feed | followed by the pack as a feed in HiC |
| r/wayfair | 13,052 | pack feed | followed by the pack as a feed in HiC |
| r/datascience | 2,775,884 | HiC Suggest from goal | Data analysts discussing predictive modeling for churn, donor lapse, and machine learning pipelines. |
| r/marketing | 1,985,640 | HiC Suggest from goal | Copywriters and growth marketers discussing AI outreach performance, email retention, and personalized messaging. |
| r/sales | 615,846 | HiC Suggest from goal | Frontline sales reps and major gift equivalents sharing AI meeting prep workflows and CRM tools. |
| r/DigitalMarketing | 480,785 | HiC Suggest from goal | Nonprofit marketers sharing campaign performance, AI copy generation, and audience segmentation. |
| r/copywriting | 265,371 | HiC Suggest from goal | Writers discussing AI-generated fundraising appeals, stewardship reports, and authenticity in storytelling. |
| r/gofundme | 239,337 | HiC Suggest from goal | Individual and organizational fundraisers discussing direct donor communications, trust, and campaign outcomes |
| r/dataanalysis | 235,629 | HiC Suggest from goal | Prospect researchers and data analysts discussing predictive modeling and donor wealth screening. |
| r/CPA | 134,748 | HiC Suggest from goal | Nonprofit accountants discussing grant reporting compliance, data hygiene in CRMs, and donor tax documentation. |
| r/Journalism | 130,142 | HiC Suggest from goal | Media perspectives on charity transparency, AI-generated appeals, and donor trust issues. |
| r/Emailmarketing | 126,452 | HiC Suggest from goal | Fundraisers and copywriters sharing AI personalization strategies and annual fund response rates. |
| r/salesforce | 118,952 | HiC Suggest from goal | CRM administrators building AI workflows for Salesforce Nonprofit Success Pack (NPSP). |
| r/Charity | 106,629 | HiC Suggest from goal | Donors and volunteers sharing perspectives on transparency and non-profit communications. |
| r/CRM | 62,627 | HiC Suggest from goal | Database managers comparing CRM platforms, data hygiene, and AI feature rollouts. |
| r/healthIT | 60,723 | HiC Suggest from goal | Healthcare IT professionals discussing data privacy and grateful patient software integrations. |
| r/University | 56,839 | HiC Suggest from goal | Higher education personnel discussing institutional technology investments, university strategy, and donor relations |
| r/patreon | 48,987 | HiC Suggest from goal | Recurring gift managers and creators sharing tactics on automated subscriber retention and messaging |
| r/Philanthropy | 13,979 | HiC Suggest from goal | Foundation staff and major donors sharing views on giving trends and AI proposals. |
| r/Zoho | 13,904 | HiC Suggest from goal | Small nonprofit operations teams adopting budget-friendly CRM automation and AI features |
| r/privacy | 1,688,254 | HiC Suggest from goal | Discussions on donor record privacy, data security, and ethical concerns regarding AI scraping. |
| r/generativeAI | 186,740 | HiC Suggest from goal | Practitioners discussing draft quality and errors in AI-generated grant proposals and appeals. |
| r/Ethics | 54,718 | HiC Suggest from goal | Discussions around the ethics of AI communications and data privacy in public sectors. |

Left out after Reddit's check: r/fundraising (not served (HTTP 403)); r/highered (restricted); r/artificialintelligence (not served (HTTP 404)); r/prospectresearch (restricted); r/nonprofits (restricted); r/blackbaud (not served (HTTP 302)); r/highereducation (restricted); r/apra (restricted); r/socialgood (restricted); r/advancement (not served (HTTP 404)); r/nonprofitmanagement (not served (HTTP 302)); r/alumni (not served (HTTP 403)); r/hospitals (restricted); r/databaseadministration (not served (HTTP 404)); r/businessintelligence (restricted); r/salesforceservicecloud (not served (HTTP 404)); r/crowdfunding (restricted); r/techforgood (28 members); r/volunteering (restricted); r/k12sysadmin (restricted); r/directmail (406 members); r/nonprofittech (908 members); r/grantmakers (not served (HTTP 302)); r/grantseekers (not served (HTTP 302)); r/givingtuesday (not served (HTTP 302)); r/nonprofitjobs (restricted); r/charities (restricted); r/healthcareadmin (restricted); r/educationaltechnology (restricted); r/familyoffice (restricted); r/ministry (restricted); r/socialworkers (not served (HTTP 404)); r/kiva (578 members); r/donorschoose (restricted); r/volunteers (not served (HTTP 403)); r/charitynavigator (not served (HTTP 302)); r/dtcmarketing (not served (HTTP 302)); r/socialenterprise (restricted).

## Agriculture & Agribusiness

Audience: farmers, agronomists, ag retailers, equipment makers and agribusiness leaders.

### Market-research questions

1. How are row-crop farmers using AI for yield prediction and input decisions?
2. Which precision agriculture AI tools do farmers trust, and which do they abandon?
3. How do farmers feel about John Deere and other equipment makers' AI and data practices?
4. What is the real cost and payback of AI-driven variable rate application?
5. How are agronomists using AI for crop scouting and disease identification?
6. How is computer vision used for weed detection and targeted spraying?
7. What do farmers say about autonomous tractors and robotics on the farm?
8. How are dairy and livestock producers using AI for herd health monitoring?
9. How is AI used to forecast commodity prices and marketing decisions?
10. What data ownership and right-to-repair concerns do farmers raise about AI equipment?
11. How do small and mid-size farms access AI compared with large operations?
12. How are ag retailers and co-ops using AI to recommend products to growers?
13. How is AI used in irrigation scheduling and water management?
14. What role does AI play in carbon credit and regenerative agriculture programs?
15. How are greenhouse and vertical farming operations using AI for climate control?
16. What labor shortages are pushing farms toward AI and automation?
17. How are drones combined with AI for field mapping and spraying?
18. What do farmers say about connectivity limits for AI tools in rural areas?
19. How is AI used in food supply chain traceability from farm to retailer?
20. How are crop insurers and lenders using AI to assess farm risk?
21. What extension services and land-grant universities teach about AI on farms?
22. How is AI used for soil health analysis and nutrient management?
23. How do farmers evaluate AI agronomy apps against advice from human agronomists?
24. What regulations govern agricultural drones and AI spraying?
25. How are specialty crop growers (fruit, vegetables, vineyards) using AI and robotics?
26. How is AI changing grain handling, storage and quality grading?
27. What are the most common complaints about farm management software with AI?
28. How are agribusiness companies marketing AI features to farmers?
29. How is AI used to predict pest outbreaks and weather risk?
30. What do young farmers and new entrants expect from AI tools?

### Subreddits crawled (29)

| Subreddit | Members | Named by | Why it is crawled |
|---|---|---|---|
| r/homestead | 3,555,910 | HiC Suggest from goal and pack feed | Smallholders and small-scale farmers discuss accessible agricultural automation tools, robotics, and affordable tech options. |
| r/farming | 220,732 | HiC Suggest from goal and pack feed | Active community of working farmers sharing firsthand experiences with machinery, software, and everyday farm management. |
| r/Agriculture | 73,700 | HiC Suggest from goal and pack feed | Farmers and industry professionals discuss agricultural technology, policy, market dynamics, and operational practices. |
| r/tractors | 72,651 | HiC Suggest from goal and pack feed | Machinery enthusiasts and farmers evaluate tractor technology, auto-steer, and automated features. |
| r/Ranching | 42,423 | HiC Suggest from goal and pack feed | Livestock producers share real-world feedback on herd tracking, automated monitoring, and smart livestock equipment. |
| r/Cattle | 20,918 | HiC Suggest from goal and pack feed | Livestock producers share experiences with herd monitoring, health tracking, and farm tech. |
| r/righttorepair | 12,266 | HiC Suggest from goal | Farmers discussing digital lockouts, telemetry access, and software rights on modern equipment. |
| r/dairyfarming | 6,051 | HiC Suggest from goal | Dairy operators discuss robotic milking systems, automated health collars, and sensor-driven herd tracking. |
| r/PrecisionAg | 1,950 | HiC Suggest from goal | Dedicated to variable-rate tech, telemetry, guidance systems, computer vision, and farm data management systems. |
| r/vegetablegardening | 851,235 | pack feed | followed by the pack as a feed in HiC |
| r/Permaculture | 378,471 | pack feed | followed by the pack as a feed in HiC |
| r/Beekeeping | 249,219 | pack feed | followed by the pack as a feed in HiC |
| r/Hydroponics | 196,864 | pack feed | followed by the pack as a feed in HiC |
| r/robotics | 347,603 | HiC Suggest from goal | Engineers discuss computer vision, autonomous tractors, mechanical weeders, and agricultural robotics hardware. |
| r/drones | 296,463 | HiC Suggest from goal | Drone pilots and operators discuss multispectral sensors, field mapping software, and aerial spraying regulations. |
| r/computervision | 169,186 | HiC Suggest from goal | Engineers and developers discussing agricultural weed spraying and crop monitoring vision models. |
| r/gis | 154,340 | HiC Suggest from goal | GIS professionals analyze remote sensing data, satellite imagery, and spatial analysis used in precision agriculture. |
| r/pestcontrol | 109,661 | HiC Suggest from goal | Agricultural and structural pest managers discuss outbreak tracking and application tools. |
| r/microgreens | 103,459 | HiC Suggest from goal | Controlled-environment growers sharing experience with automated irrigation, lighting, and monitoring tools. |
| r/Horticulture | 86,780 | HiC Suggest from goal | Greenhouse and specialty crop growers discuss environmental controls and automated monitoring systems. |
| r/Irrigation | 63,618 | HiC Suggest from goal | Irrigation specialists debate smart water management, automated sensors, and scheduling software. |
| r/heavyequipment | 45,676 | HiC Suggest from goal | Equipment operators and technicians discuss smart machinery, telemetry, and right-to-repair data practices. |
| r/greenhouse | 28,184 | HiC Suggest from goal | Controlled environment growers discuss climate automation, sensor integration, and crop tracking. |
| r/verticalfarming | 20,387 | HiC Suggest from goal | Indoor farm operators evaluate automated HVAC, climate control AI, and sensor integration in controlled environment agriculture. |
| r/viticulture | 10,545 | HiC Suggest from goal | Vineyard managers detail specialty crop technology, computer vision, and automated harvesting tools. |
| r/gardening | 9,045,618 | HiC Suggest from goal | Small-scale specialty growers debate automation, pest identification apps, and soil testing. |
| r/hardware | 4,376,531 | HiC Suggest from goal | Discussions on edge computing devices and sensor systems deployed in rugged agricultural environments. |
| r/supplychain | 119,625 | HiC Suggest from goal | Logistics professionals explore food traceability, grain transportation, and agricultural supply chain AI. |
| r/Commodities | 43,229 | HiC Suggest from goal | Traders and producers discuss grain markets, price forecasting models, and algorithmic hedging strategies. |

Left out after Reddit's check: r/agronomy (restricted); r/uavs (restricted); r/agtechnology (restricted); r/soilhealth (not served (HTTP 403)); r/weedmath (not served (HTTP 302)); r/artificialintelligence (not served (HTTP 404)); r/farmequipment (restricted); r/grainmarketing (not served (HTTP 403)); r/commercialgardening (not served (HTTP 302)); r/precisionagriculture (restricted).

## Energy & Utilities

Audience: utilities, grid operators, energy retailers, oil and gas, renewables developers and their customers.

### Market-research questions

1. How are utilities using AI for load forecasting and grid balancing?
2. How is AI data center demand changing utility planning and electricity prices?
3. How are utilities using AI for predictive maintenance of transformers and lines?
4. How do utility customers react to AI chatbots for billing and outage questions?
5. How is AI used for wildfire risk detection and vegetation management?
6. How are solar and wind operators using AI to forecast generation?
7. How is AI used in battery storage dispatch and energy trading?
8. What do lineworkers and field crews say about AI tools and drones for inspections?
9. How are oil and gas companies using AI for exploration and drilling optimization?
10. How is AI used in smart meter data analytics and demand response?
11. What cybersecurity risks does AI introduce for the grid?
12. How are regulators and public utility commissions treating AI investments in rate cases?
13. How are homeowners using AI-enabled thermostats and home energy management?
14. How is AI changing EV charging network planning and pricing?
15. What workforce skills are utilities hiring for as AI spreads?
16. How are utilities using AI to speed interconnection queue studies?
17. How do consumers feel about utilities using their energy data for AI models?
18. How is AI used in nuclear plant operations and safety?
19. How is AI used to detect energy theft and billing anomalies?
20. What results have utilities reported from AI in storm restoration?
21. How are energy retailers using AI to personalize plans and reduce churn?
22. How is AI used for methane leak detection and emissions reporting?
23. How do grid operators use AI for transmission congestion management?
24. What are the biggest AI failures or controversies in the energy sector?
25. How are small municipal utilities and co-ops adopting AI?
26. How is AI used in hydrogen and carbon capture project development?
27. What do energy engineers say about AI copilots for planning and design?
28. How are AI and data centers affecting community opposition to new power plants?
29. How is AI used in energy efficiency programs for commercial buildings?
30. What vendors lead AI platforms for utilities, and how do utilities choose them?

### Subreddits crawled (38)

| Subreddit | Members | Named by | Why it is crawled |
|---|---|---|---|
| r/homeautomation | 4,600,778 | HiC Suggest from goal | Tech-savvy homeowners discussing smart thermostats, home energy management, and demand response programs. |
| r/electricians | 586,416 | HiC Suggest from goal and pack feed | Field trade professionals discussing practical equipment deployment, smart tech, and grid connections. |
| r/electricvehicles | 454,190 | HiC Suggest from goal and pack feed | EV owners discussing managed charging schemes, smart rates, and utility load management. |
| r/energy | 301,414 | HiC Suggest from goal and pack feed | Broad industry hub with discussions on grid modernization, load growth, and AI data centers. |
| r/solar | 205,360 | HiC Suggest from goal and pack feed | Solar installers and system operators discussing grid interconnection, inverter data, and generation models. |
| r/RenewableEnergy | 164,703 | HiC Suggest from goal and pack feed | Solar, wind, and storage developers sharing experiences with generation forecasting and dispatch AI. |
| r/nuclear | 101,745 | HiC Suggest from goal and pack feed | Nuclear industry workers discussing plant monitoring, predictive maintenance, and digital twin safety. |
| r/Lineman | 70,185 | HiC Suggest from goal | Lineworkers sharing ground-level perspectives on automated inspections, drone usage, and storm response. |
| r/heatpumps | 66,044 | HiC Suggest from goal and pack feed | Homeowners discussing automated home energy management systems and grid demand response integration. |
| r/oilandgasworkers | 59,962 | HiC Suggest from goal and pack feed | Field workers and engineers sharing practical perspectives on upstream AI, automation, and software adoption. |
| r/datacenter | 48,355 | HiC Suggest from goal | Data center operators discussing massive power demand, utility interconnect delays, and power sourcing. |
| r/evcharging | 40,448 | HiC Suggest from goal | EV infrastructure operators and drivers discussing grid strain, smart charging algorithms, and pricing. |
| r/EnergyStorage | 17,824 | HiC Suggest from goal | Battery storage developers and engineers discuss AI dispatch, trading algorithms, and grid integration. |
| r/oilandgas | 15,680 | HiC Suggest from goal | Upstream/midstream practitioners discussing drilling optimization, subsurface AI models, and emissions tracking. |
| r/SCADA | 11,756 | HiC Suggest from goal | Industrial automation engineers discussing grid control, real-time data, and utility automation systems. |
| r/AskElectricians | 306,073 | pack feed | followed by the pack as a feed in HiC |
| r/OffGrid | 259,251 | pack feed | followed by the pack as a feed in HiC |
| r/SolarDIY | 161,429 | pack feed | followed by the pack as a feed in HiC |
| r/NuclearPower | 66,392 | pack feed | followed by the pack as a feed in HiC |
| r/geothermal | 9,698 | pack feed | followed by the pack as a feed in HiC |
| r/hardware | 4,376,531 | HiC Suggest from goal | Tech professionals discussing massive AI data center power draw and utility infrastructure constraints. |
| r/cybersecurity | 1,575,330 | HiC Suggest from goal | Security professionals discussing critical infrastructure vulnerabilities and AI-driven grid threats. |
| r/engineering | 751,671 | HiC Suggest from goal | Professional engineers sharing real-world adoption of AI design copilots and simulation tools. |
| r/homeassistant | 624,416 | HiC Suggest from goal | Tech-savvy homeowners integrating smart meter data, battery storage, and dynamic tariff optimization. |
| r/dataengineering | 487,539 | HiC Suggest from goal | Data engineers discussing enterprise smart meter ingestion pipelines and energy sector AI infrastructure. |
| r/geology | 301,991 | HiC Suggest from goal | Geoscientists sharing hands-on experience with seismic AI tools for subsurface exploration. |
| r/drones | 296,463 | HiC Suggest from goal | Commercial drone pilots sharing experiences with line inspections, thermography, and vegetation mapping. |
| r/gis | 154,340 | HiC Suggest from goal | GIS professionals managing utility asset mapping, vegetation management, and spatial AI modeling. |
| r/PLC | 145,294 | HiC Suggest from goal | Industrial automation control engineers discussing SCADA, edge AI, and OT cybersecurity in critical infrastructure. |
| r/ChemicalEngineering | 143,199 | HiC Suggest from goal | Engineers discussing process control AI in refineries, hydrogen production, and carbon capture. |
| r/Nest | 91,608 | HiC Suggest from goal | Smart home consumers discussing automated HVAC energy savings and utility data sharing. |
| r/ecobee | 54,400 | HiC Suggest from goal | End-users detailing experiences with automated thermostat algorithms and utility demand-response events. |
| r/UAVmapping | 26,935 | HiC Suggest from goal | Drone operators discussing automated utility line inspection, thermal imaging, and computer vision models. |
| r/dataisbeautiful | 21,858,713 | HiC Suggest from goal | Analysts showing grid load models, electricity price shifts, and data center energy visualization. |
| r/MachineLearning | 3,084,408 | HiC Suggest from goal | Practitioners discussing specialized AI models for time-series forecasting, grid optimization, and physical systems. |
| r/environment | 1,559,628 | HiC Suggest from goal | Community members discussing local opposition to data centers, grid expansion, and power plants. |
| r/consulting | 389,587 | HiC Suggest from goal | Management and IT consultants discussing energy client AI deployments and vendor selections. |
| r/geologycareers | 56,997 | HiC Suggest from goal | Subsurface geoscientists discussing AI seismic interpretation tools and industry skill shifts. |

Left out after Reddit's check: r/gridstatus (not served (HTTP 302)); r/energyengineering (99 members); r/geosteering (not served (HTTP 302)); r/utilitymerchants (not served (HTTP 302)); r/windpower (restricted); r/homeenergy (restricted); r/gispro (1 members); r/climateops (not served (HTTP 302)); r/energyeconomics (4 members); r/grid (317 members); r/geotechnical (not served (HTTP 404)); r/oilandgasmarket (not served (HTTP 302)); r/netzero (819 members); r/nuke (538 members); r/dataisstinky (not served (HTTP 302)); r/buildingcontrol (3 members); r/utility (restricted).

## Executive Search & Leadership Advisory

Audience: executive search firms, leadership advisors, boards and senior candidates.

### Market-research questions

1. How are executive search firms using AI to source and assess senior candidates?
2. How do senior executives feel about AI screening in leadership hiring?
3. What AI tools do recruiters use for candidate mapping and market intelligence?
4. How is AI changing the retained search business model and fees?
5. How do boards evaluate AI expertise when hiring CEOs and directors?
6. What new AI leadership roles (Chief AI Officer) are companies hiring for?
7. How are leadership assessments and psychometrics using AI?
8. What bias and fairness concerns arise with AI in executive hiring?
9. How do candidates use AI to prepare resumes, cover letters and interviews for senior roles?
10. How is AI used in succession planning and internal talent mobility?
11. What do in-house talent acquisition leaders say about AI versus search firms?
12. How are LinkedIn Recruiter and other platforms adding AI for executive search?
13. How is AI changing compensation benchmarking for executives?
14. What regulations (such as NYC Local Law 144) affect AI in hiring?
15. How do search consultants describe AI's effect on their daily work?
16. How is AI used in reference checking and background due diligence?
17. What skills do companies want in leaders to manage AI transformation?
18. How do executives describe job searching in an AI-driven market?
19. How are leadership development and executive coaching using AI?
20. How is AI used for diversity sourcing in leadership pipelines?
21. What are candidate experience complaints about AI in recruiting?
22. How do private equity firms use AI to assess portfolio company leadership?
23. How is AI affecting interim executive and fractional leadership markets?
24. How are search firms marketing AI capabilities to clients?
25. What do HR leaders say about AI-written job descriptions for senior roles?
26. How is AI used for board evaluation and governance advisory?
27. How do recruiters detect AI-generated applications and interview answers?
28. How are outplacement and career transition services using AI?
29. What are the risks of AI hallucination in candidate research reports?
30. How is AI changing networking and relationship-based hiring at the top?

### Subreddits crawled (31)

| Subreddit | Members | Named by | Why it is crawled |
|---|---|---|---|
| r/recruitinghell | 1,551,785 | HiC Suggest from goal | Candidates share authentic complaints about AI screening, automated rejection, and interview tools. |
| r/ExperiencedDevs | 427,719 | HiC Suggest from goal | Senior technical leaders discuss executive hiring, technical leadership roles, and AI evaluation. |
| r/humanresources | 245,404 | HiC Suggest from goal and pack feed | In-house HR leaders discussing search firm usage, executive hiring, and AI tool adoption. |
| r/recruiting | 223,393 | HiC Suggest from goal and pack feed | Agency and third-party recruiters discussing search tools, candidate sourcing, and industry shifts. |
| r/Leadership | 151,681 | HiC Suggest from goal | Senior executives and management advisors discussing AI transformation, governance, and executive hiring |
| r/HumanResourcesUK | 45,577 | HiC Suggest from goal | UK-based HR leaders and executive recruiters discussing talent acquisition, AI tooling, and governance |
| r/Recruitment | 28,345 | HiC Suggest from goal | Agency and executive search consultants discussing recruitment tech, AI sourcing tools, and client expectations |
| r/executivecoaching | 5,781 | HiC Suggest from goal | Leadership advisors and coaches share insights on AI integration and executive assessment. |
| r/AskHR | 1,853,814 | pack feed | followed by the pack as a feed in HiC |
| r/careerguidance | 5,069,234 | HiC Suggest from goal | Mid-to-senior professionals seeking advice on executive job transitions and AI-driven hiring processes. |
| r/jobs | 2,877,197 | HiC Suggest from goal | Candidates sharing first-person experiences with AI screening, ATS systems, and automated interviews. |
| r/cscareerquestions | 2,408,089 | HiC Suggest from goal | Staff/Principal engineers discuss navigating AI resumes, executive search processes, and market conditions. |
| r/FinancialCareers | 1,785,791 | HiC Suggest from goal | Senior finance leaders and recruiters discuss executive search, PE portfolio leadership, and compensation. |
| r/resumes | 1,329,064 | HiC Suggest from goal | Job seekers discussing AI resume tailoring, optimization for ATS, and cover letter generation. |
| r/consulting | 389,587 | HiC Suggest from goal | Management consultants and advisors discussing organizational leadership, executive advisory, and AI transformation. |
| r/interviews | 329,816 | HiC Suggest from goal | Candidates discussing AI interview prep, executive interview formats, and AI screening experiences |
| r/managers | 298,319 | HiC Suggest from goal | Mid-to-senior managers discuss adopting AI recruiting tools, interviewing candidates, and talent assessment. |
| r/linkedin | 171,895 | HiC Suggest from goal | Recruiters and candidates discussing LinkedIn Recruiter AI features, outreach automation, and platform changes. |
| r/jobsearch | 147,935 | HiC Suggest from goal | Senior job seekers documenting modern executive job search tactics, AI tools, and headhunter outreach |
| r/Resume | 131,101 | HiC Suggest from goal | Senior candidates discussing resume optimization for AI screening tools and applicant tracking software |
| r/Careers | 71,920 | HiC Suggest from goal | Experienced professionals sharing candidate-side perspectives on executive job searches and recruiter AI interactions |
| r/ceo | 20,167 | HiC Suggest from goal | CEOs and top leaders discuss executive hiring decisions, board expectations, and AI leadership. |
| r/managementconsulting | 17,799 | HiC Suggest from goal | Advisors discuss corporate AI transformation, leadership advisory services, and org design. |
| r/LeadershipDevelopment | 4,497 | HiC Suggest from goal | Leadership advisors discussing executive coaching, psychometric assessments, and succession planning tools. |
| r/Executives | 1,126 | HiC Suggest from goal | Senior leaders share experiences being recruited, AI screening reactions, and executive job searching. |
| r/MachineLearning | 3,084,408 | HiC Suggest from goal | Practitioners occasionally debate fairness, bias, and technical viability of AI assessment tools. |
| r/startup | 327,864 | HiC Suggest from goal | Founders and CEOs discuss hiring fractional executives, executive search, and leadership assessment. |
| r/work | 312,389 | HiC Suggest from goal | Candidates share experiences with automated screening, resume tailors, and AI application tools. |
| r/venturecapital | 87,999 | HiC Suggest from goal | Investors discuss portfolio company executive hiring, talent management, and board seat placement. |
| r/EmploymentLaw | 20,031 | HiC Suggest from goal | Legal practitioners discuss compliance issues like NYC Local Law 144 in automated hiring. |
| r/FutureOfWork | 8,718 | HiC Suggest from goal | Discussions on AI workforce transformation, leadership skill shifts, and governance trends. |

Left out after Reddit's check: r/executivejobs (not served (HTTP 302)); r/talentacquisition (restricted); r/headhunter (not served (HTTP 404)); r/privateequity (not served (HTTP 403)); r/artificialintelligence (not served (HTTP 404)); r/ethicstraining (not served (HTTP 302)); r/leaddev (restricted); r/peopleops (restricted); r/mbalounge (not served (HTTP 302)); r/csuite (899 members); r/cto (restricted); r/recruiters (restricted); r/corporategovernance (466 members); r/fractionalleadership (not served (HTTP 403)); r/interviewing (restricted); r/chiefaiofficer (restricted); r/techmanagement (not served (HTTP 302)); r/recruitingtools (not served (HTTP 404)); r/hrtech (not served (HTTP 404)); r/recruiter (restricted); r/chieftechnologyofficer (not served (HTTP 404)); r/humanresource (not served (HTTP 404)); r/csuiteit (not served (HTTP 302)); r/pe_recruiting (not served (HTTP 302)); r/interimexecutives (not served (HTTP 302)); r/advisoryboards (not served (HTTP 302)); r/headhunting (restricted); r/techrecruiting (not served (HTTP 404)); r/corporatehr (not served (HTTP 302)); r/consultants (restricted); r/fractional (not served (HTTP 403)); r/talentmanagement (not served (HTTP 404)); r/recruitmentagencies (restricted); r/hr (not served (HTTP 404)); r/executivesearch (not served (HTTP 404)); r/executiverecruiting (not served (HTTP 302)); r/headhunters (7 members); r/boardofdirectors (not served (HTTP 404)); r/hrprofessionals (23 members); r/fractionalexecutives (not served (HTTP 404)); r/interimmanagement (restricted); r/coaching (restricted); r/compensation (restricted).

## Financial Services

Audience: banks, credit unions, wealth managers, fintechs, payments firms and their customers.

### Market-research questions

1. How are banks using generative AI in customer service and call centers?
2. How do bank customers feel about AI chatbots and virtual assistants?
3. How is AI used for fraud detection and scams prevention in payments?
4. How are wealth managers and financial advisors using AI tools?
5. How do investors use AI for stock research and trading decisions?
6. How is AI used in credit underwriting and lending decisions, and is it fair?
7. What regulations govern AI in banking (model risk, fair lending, EU AI Act)?
8. How are credit unions and community banks adopting AI?
9. How is AI changing anti-money laundering and KYC compliance work?
10. What do bank employees say about AI changing their jobs?
11. How are fintech apps using AI for budgeting and personal finance advice?
12. How is AI used in mortgage processing and home lending?
13. How do consumers react to AI-driven loan denials and explanations?
14. How are insurers and banks using AI for claims and dispute handling?
15. How is AI used in accounting, audit and financial reporting?
16. What are deepfake and voice-cloning fraud risks for banks and customers?
17. How do traders and quants use AI and machine learning in markets?
18. How are payment networks using AI for authorization and risk scoring?
19. How is AI used in debt collection and customer hardship programs?
20. How do robo-advisors compare with human advisors in client trust?
21. What AI vendors are banks buying, and how do they evaluate them?
22. How is AI changing small business lending and banking?
23. What do customers say about AI in credit card rewards and offers?
24. How are banks governing employee use of ChatGPT and copilots?
25. How is AI used in tax preparation and tax advice?
26. How do retirement savers use AI for planning?
27. What are the biggest AI failures or outages reported by banks?
28. How is AI used in crypto trading and DeFi risk?
29. How do financial analysts use AI for earnings and research summaries?
30. How is AI affecting branch networks and in-person banking?

### Subreddits crawled (38)

| Subreddit | Members | Named by | Why it is crawled |
|---|---|---|---|
| r/personalfinance | 21,906,189 | HiC Suggest from goal | Everyday banking customers reviewing AI chatbots, automated budgeting apps, and credit decision experiences. |
| r/algotrading | 1,902,248 | HiC Suggest from goal | Quantitative traders and developers sharing machine learning models, trading algorithms, and market data techniques. |
| r/Scams | 1,447,720 | HiC Suggest from goal | Consumers reporting real-world deepfake voice impersonation, banking fraud, and AI-driven phishing experiences. |
| r/Accounting | 1,301,427 | HiC Suggest from goal | CPAs and auditors discussing AI tools for financial reporting, audit automation, and tax prep. |
| r/FinancialPlanning | 991,885 | HiC Suggest from goal | Financial planners and advisors discussing robo-advisors, client trust, and AI wealth management tools. |
| r/Insurance | 242,014 | HiC Suggest from goal | Insurance professionals discussing automated claims processing, AI underwriting, and fraud detection technology. |
| r/quant | 211,819 | HiC Suggest from goal | Quants and financial engineers discuss machine learning models, trading algorithms, and institutional market risk. |
| r/Banking | 186,072 | HiC Suggest from goal | Retail and commercial banking staff discussing operations, vendor software, and internal AI tools. |
| r/fintech | 100,178 | HiC Suggest from goal | Fintech product managers and founders discussing AI features, personal finance apps, and tech stack choices. |
| r/Compliance | 10,213 | HiC Suggest from goal | Compliance officers discussing AML, KYC, model risk management, and AI regulatory enforcement. |
| r/fintechdev | 5,792 | HiC Suggest from goal | Developers build payments, credit scoring, and banking APIs using AI and machine learning. |
| r/wealthmanagement | 2,915 | HiC Suggest from goal | Financial advisors discuss client management tools, robo-advisors, and AI adoption in portfolio management. |
| r/ChatGPT | 11,763,199 | HiC Suggest from goal | Knowledge workers across industries share practical prompts and enterprise policies around Copilot usage. |
| r/CryptoCurrency | 10,176,457 | HiC Suggest from goal | Traders and users discuss automated trading bots, DeFi risk scoring, and AI-driven crypto analysis. |
| r/stocks | 9,427,652 | HiC Suggest from goal | Active stock traders sharing experiences with AI screening tools, sentiment analysis, and trade execution. |
| r/investing | 3,496,162 | HiC Suggest from goal | Retail investors discussing AI stock research tools, earnings summary bots, and automated portfolio management. |
| r/MachineLearning | 3,084,408 | HiC Suggest from goal | ML engineers post technical case studies on fraud detection, risk scoring, and NLP applications. |
| r/datascience | 2,775,884 | HiC Suggest from goal | Data scientists and ML engineers building predictive models for credit risk, fraud, and customer service. |
| r/smallbusiness | 2,572,290 | HiC Suggest from goal | Small business owners sharing experiences with AI loan applications, automated credit lines, and banking tools. |
| r/realestateinvesting | 1,978,584 | HiC Suggest from goal | Investors discuss AI-driven mortgage underwriting, property valuation algorithms, and automated lending. |
| r/FinancialCareers | 1,785,791 | HiC Suggest from goal | Banking and finance employees discussing how workplace AI adoption affects hiring, skill needs, and job security. |
| r/cybersecurity | 1,575,330 | HiC Suggest from goal | Bank security analysts discussing deepfake prevention, payment network security, and AI threat defense. |
| r/CreditCards | 1,566,093 | HiC Suggest from goal | Consumers evaluating automated card approvals, AI fraud alerts, and personalized offer algorithms. |
| r/Fire | 1,035,832 | HiC Suggest from goal | Tech-savvy retail investors share experiences with robo-advisors, automated budgeting, and AI tax tools. |
| r/Bogleheads | 923,033 | HiC Suggest from goal | Long-term investors discussing automated portfolio management, robo-advisors, and algorithmic financial tools. |
| r/fatFIRE | 502,343 | HiC Suggest from goal | High-net-worth individuals sharing experiences with wealth managers, robo-advisors, and AI research tools. |
| r/tax | 481,077 | HiC Suggest from goal | Tax professionals and taxpayers discussing AI tax software, automated filing, and IRS AI audits. |
| r/consulting | 389,587 | HiC Suggest from goal | Financial services consultants sharing enterprise AI implementation, vendor selection, and governance challenges. |
| r/RealEstateTechnology | 58,649 | HiC Suggest from goal | Proptech and mortgage specialists discussing AI in mortgage processing, appraisals, and title work. |
| r/callcentres | 51,885 | HiC Suggest from goal | Bank call center agents discussing customer reactions to voice bots, copilot tools, and job automation. |
| r/b2b_sales | 37,777 | HiC Suggest from goal | Enterprise software reps share intelligence on selling AI solutions into financial institutions. |
| r/Risk | 18,138 | HiC Suggest from goal | Operational and model risk managers discussing AI governance frameworks, fair lending bias, and validation. |
| r/creditunions | 8,621 | HiC Suggest from goal | Credit union leaders and staff sharing insights on community bank AI vendor selection and budget constraints. |
| r/Mortgage | 3,165 | HiC Suggest from goal | Mortgage brokers and borrowers discussing automated loan approval times, document extraction, and denials. |
| r/datagovernance | 2,008 | HiC Suggest from goal | Data privacy and governance officers handling bank data policies around LLM and Copilot deployment. |
| r/Talend | 1,025 | HiC Suggest from goal | Data engineers and architects discussing enterprise data integration, governance, and banking data pipelines. |
| r/legaladvice | 3,637,309 | HiC Suggest from goal | Consumers and practitioners raising questions about AI loan discrimination, dispute resolution, and regulatory issues. |
| r/poverty | 40,939 | HiC Suggest from goal | Consumers dealing with automated debt collection, credit scoring denials, and algorithm bias impact. |

Left out after Reddit's check: r/financialservices (not served (HTTP 404)); r/commerciallending (not served (HTTP 403)); r/paymentproc (not served (HTTP 302)); r/artificialintelligence (not served (HTTP 404)); r/fraud (not served (HTTP 404)); r/financialanalysis (restricted); r/big4services (not served (HTTP 302)); r/localbanks (not served (HTTP 302)); r/customerrelations (not served (HTTP 404)); r/qsr (not served (HTTP 404)); r/fpandacommmunity (not served (HTTP 302)); r/experian (902 members).

## Government & Policy

Audience: federal, state and local agencies, public servants, policymakers and residents.

### Market-research questions

1. How are state and local governments using AI to deliver resident services?
2. How do residents feel about AI chatbots on government websites and 311 lines?
3. What AI policies and executive orders govern agency use of AI?
4. How are public servants using generative AI in daily work, and under what rules?
5. How is AI used in benefits eligibility and fraud detection, and with what errors?
6. How are cities using AI for traffic management and public safety?
7. What concerns do civil liberties groups raise about government AI and surveillance?
8. How are procurement officers buying AI tools, and what goes wrong?
9. How is AI used in permitting, licensing and code enforcement?
10. How do public sector IT teams handle legacy systems when adding AI?
11. How are courts and legal aid using AI?
12. How is AI used in emergency management and disaster response?
13. What do teachers' unions and public employee unions say about AI?
14. How are legislatures writing AI regulation, and how do companies respond?
15. How is AI used in tax administration and audits?
16. How are governments using AI translation for multilingual residents?
17. What transparency and explainability rules apply to algorithmic decisions about residents?
18. How is AI changing policing tools such as facial recognition and predictive policing?
19. How do small towns and counties with limited budgets adopt AI?
20. How is AI used in public health surveillance and program evaluation?
21. What are the most-cited AI failures in government services?
22. How are federal agencies hiring and training staff for AI?
23. How do veterans and seniors experience AI in government services?
24. How is AI used in elections administration and misinformation response?
25. How are open data portals and civic tech groups using AI?
26. How are transit agencies using AI for scheduling and maintenance?
27. How do residents view AI use in child welfare and social services?
28. What is the state of AI regulation in the EU, UK and US states compared?
29. How are governments addressing AI's effect on jobs and workforce programs?
30. How do government communications teams use AI for public messaging?

### Subreddits crawled (34)

| Subreddit | Members | Named by | Why it is crawled |
|---|---|---|---|
| r/law | 2,261,862 | HiC Suggest from goal | Legal practitioners analyze government AI regulations, court rules, and algorithmic bias litigation. |
| r/fednews | 618,059 | HiC Suggest from goal | US federal civil servants sharing day-to-day workplace policies, IT mandates, and internal AI rules. |
| r/usajobs | 207,199 | HiC Suggest from goal | Federal applicants and civil servants discuss agency tech mandates, hiring drives, and AI roles. |
| r/PublicAdministration | 9,540 | HiC Suggest from goal | Public sector managers and academics discussing agency efficiency, administrative burden, and new tools. |
| r/civictech | 3,892 | HiC Suggest from goal | Tech professionals and open-data advocates building and evaluating government technology and AI tools. |
| r/localgovernment | 2,318 | HiC Suggest from goal | City and county administrators share practical experiences with municipal software, vendors, and AI tools. |
| r/dataisbeautiful | 21,858,713 | HiC Suggest from goal | Civic hackers and analysts working with government open data portals and automated reporting tools. |
| r/technology | 20,651,921 | HiC Suggest from goal | Broad user and tech worker reactions to state/federal AI executive orders and policy news. |
| r/MachineLearning | 3,084,408 | HiC Suggest from goal | Researchers debate technical audit standards, explainability methods, and fairness in public sector algorithms. |
| r/datascience | 2,775,884 | HiC Suggest from goal | Government data scientists discuss predictive models for public health, tax audits, and fraud detection. |
| r/Teachers | 2,449,888 | HiC Suggest from goal | Public school educators discussing district AI policies, automated grading, and union stances. |
| r/privacy | 1,688,254 | HiC Suggest from goal | Civil liberties advocates discussing government surveillance, facial recognition, and resident data rights. |
| r/cybersecurity | 1,575,330 | HiC Suggest from goal | Security professionals analyzing government network defense, compliance standards, and AI vulnerability management. |
| r/sysadmin | 1,356,218 | HiC Suggest from goal | Public sector IT staff discussing legacy system integrations, procurement headaches, and AI deployments. |
| r/devops | 523,461 | HiC Suggest from goal | Engineers maintaining infrastructure for public utilities, smart cities, and modern agency backends. |
| r/consulting | 389,587 | HiC Suggest from goal | Public sector management consultants sharing insights on government digital transformation and vendor RFPs. |
| r/urbanplanning | 237,923 | HiC Suggest from goal | City planners discussing Smart City initiatives, automated traffic management, and municipal permitting software. |
| r/USPS | 194,186 | HiC Suggest from goal | Postal workers discussing logistics, automation, route tech, and frontline public service operations. |
| r/Veterans | 182,350 | HiC Suggest from goal | Veterans describing interactions with VA portals, automated disability claim processing, and digital services. |
| r/gis | 154,340 | HiC Suggest from goal | Geospatial professionals in government mapping, public safety, urban planning, and emergency management tech. |
| r/transit | 146,169 | HiC Suggest from goal | Public transit workers discussing automated scheduling, predictive maintenance, and passenger routing technology. |
| r/socialwork | 134,803 | HiC Suggest from goal | Social workers discussing algorithmic eligibility, child welfare software, and automated benefits systems. |
| r/police | 99,079 | HiC Suggest from goal | Law enforcement officers sharing experiences with surveillance tools, facial recognition, and dispatch AI. |
| r/legaltech | 36,645 | HiC Suggest from goal | Legal professionals discussing AI adoption in courts, legal aid, and regulatory compliance. |
| r/EmergencyManagement | 23,335 | HiC Suggest from goal | Disaster response personnel discussing situational awareness tools and predictive analytics in emergencies. |
| r/Unemployment | 1,007,563 | HiC Suggest from goal | Claimants share experiences navigating automated state benefit eligibility portals and fraud detection errors. |
| r/tax | 481,077 | HiC Suggest from goal | Tax professionals and IRS staff discuss automated processing, audit selection, and tax software AI. |
| r/ebikes | 286,942 | HiC Suggest from goal | Micromobility and smart city transit users reacting to automated traffic enforcement and sensors. |
| r/humanresources | 245,404 | HiC Suggest from goal | Public and private HR specialists discussing automated hiring tools, résumé screeners, and civil service exams. |
| r/nonprofit | 97,401 | HiC Suggest from goal | Nonprofit staff discussing civic tech implementation, benefits advocacy, and legal aid technology. |
| r/Ethics | 54,718 | HiC Suggest from goal | Ethicists and citizens discussing automated decision-making risks in welfare and policing. |
| r/uspolitics | 44,649 | HiC Suggest from goal | Voters and political observers discussing federal AI executive orders and state legislation. |
| r/procurement | 33,594 | HiC Suggest from goal | Purchasing agents discussing vendor bidding, RFP processes, and software acquisition pain points. |
| r/humanrights | 16,329 | HiC Suggest from goal | Advocates discussing algorithmic bias, facial recognition bans, and civil liberties concerns. |

Left out after Reddit's check: r/publicsector (8 members); r/governmentit (7 members); r/lawandpolicy (1 members); r/lawenforcement (not served (HTTP 403)); r/artificialintelligence (not served (HTTP 404)); r/lawchool (not served (HTTP 302)); r/opennlp (not served (HTTP 302)); r/defensetech (restricted); r/government (restricted); r/policy (restricted); r/digitalcitizenship (6 members); r/eugovernance (not served (HTTP 302)); r/firefighters (restricted); r/elections (restricted); r/fednet (4 members); r/civilservant (not served (HTTP 403)).

## Healthcare & Life Sciences

Audience: health systems, clinicians, nurses, payers, pharma and biotech, and patients.

### Market-research questions

1. How are physicians using AI scribes and ambient documentation, and do they save time?
2. How do nurses feel about AI tools in staffing, charting and patient monitoring?
3. How do patients feel about AI in diagnosis and patient portals?
4. How are health systems using AI in revenue cycle and prior authorization?
5. How are payers using AI for claims decisions and denials, and what do patients say?
6. How is AI used in radiology and medical imaging today?
7. How is AI used in drug discovery and clinical trial recruitment?
8. What FDA rules govern AI medical devices and software?
9. How do clinicians judge the accuracy of AI answers to medical questions?
10. How are hospitals governing generative AI use by staff?
11. How is AI affecting nurse and physician burnout?
12. How is AI used in mental health apps and therapy chatbots, and is it safe?
13. How are pharmacies and pharmacists using AI?
14. How is AI used for sepsis prediction and early warning systems, and how accurate are they?
15. What do medical students and residents say about learning with AI?
16. How are Epic and other EHR vendors adding AI features?
17. How is AI used in home health, remote patient monitoring and hospital-at-home?
18. What privacy and HIPAA concerns arise with AI in healthcare?
19. How do patients use ChatGPT to research symptoms and treatments?
20. How is AI used in medical billing and coding jobs?
21. How are rural hospitals adopting AI with limited resources?
22. What bias and equity problems have been found in clinical AI?
23. How is AI used in pathology and lab medicine?
24. How are life sciences companies using AI in regulatory submissions and pharmacovigilance?
25. How is AI used in patient scheduling, call centers and no-show prediction?
26. What do caregivers and families say about AI in elder care?
27. How is AI used in dental and veterinary practices?
28. What results have health systems published on AI ROI?
29. How are medical device makers using AI in products?
30. How do healthcare workers view AI's effect on jobs and staffing?

### Subreddits crawled (43)

| Subreddit | Members | Named by | Why it is crawled |
|---|---|---|---|
| r/nursing | 1,151,927 | HiC Suggest from goal and pack feed | Nurses sharing real-world experiences with charting, AI monitoring, staffing tools, and clinical burnout. |
| r/AskDocs | 843,255 | HiC Suggest from goal and pack feed | Patients sharing self-diagnoses via ChatGPT alongside verified physician reactions to AI queries. |
| r/medicalschool | 818,649 | HiC Suggest from goal and pack feed | Medical students discussing AI study tools, medical education, and future career impacts. |
| r/medicine | 574,534 | HiC Suggest from goal and pack feed | Physicians and healthcare professionals discussing clinical workflows, AI ambient scribes, and administrative burden. |
| r/Residency | 298,493 | HiC Suggest from goal and pack feed | Resident physicians discussing medical learning with AI, administrative workload, and burnout. |
| r/biotech | 261,223 | HiC Suggest from goal and pack feed | Industry professionals discussing AI in drug discovery, clinical trials, and biotech innovation. |
| r/Radiology | 240,503 | HiC Suggest from goal and pack feed | Radiologists discussing AI image analysis tools, triage algorithms, and diagnostic accuracy in practice. |
| r/pharmacy | 207,437 | HiC Suggest from goal and pack feed | Pharmacists sharing perspective on automated dispensing, AI tools, and pharmacy operations. |
| r/bioinformatics | 168,507 | HiC Suggest from goal and pack feed | Researchers discuss machine learning models for genomic analysis, drug discovery, and target identification. |
| r/emergencymedicine | 145,997 | HiC Suggest from goal and pack feed | ER clinicians evaluating sepsis prediction alerts, triage tools, and clinical risk algorithms. |
| r/HealthInsurance | 126,740 | HiC Suggest from goal and pack feed | Patients and professionals discussing prior authorization, claims processing, and AI denials. |
| r/physicaltherapy | 103,353 | HiC Suggest from goal | PT practitioners review ambient EMR scribes, billing automation, and patient progress tracking tools. |
| r/PharmacyTechnician | 80,190 | HiC Suggest from goal and pack feed | Pharmacy staff discuss automated dispensing systems, AI order verification, and staffing impacts. |
| r/nursepractitioner | 75,668 | HiC Suggest from goal and pack feed | Advanced practice nurses discuss AI charting assistants, workload relief, and clinical decision support accuracy. |
| r/clinicalresearch | 68,042 | HiC Suggest from goal and pack feed | Clinical research coordinators discussing AI-driven trial recruitment and regulatory compliance. |
| r/healthIT | 60,723 | HiC Suggest from goal and pack feed | Enterprise healthcare IT workers managing HIPAA compliance, AI vendor integrations, and security. |
| r/MedicalCoding | 36,873 | HiC Suggest from goal | Medical coders discussing AI-assisted billing, revenue cycle management, and job impact. |
| r/pathology | 28,888 | HiC Suggest from goal | Pathologists discussing digital pathology, AI image classification, and diagnostic accuracy. |
| r/MedicalDevices | 28,209 | HiC Suggest from goal and pack feed | Regulatory specialists and engineers discuss FDA compliance and AI software as medical device (SaMD). |
| r/InternalMedicine | 20,364 | HiC Suggest from goal | Attending physicians share authentic experiences with AI ambient scribes, diagnostics, and EHR burnout. |
| r/science | 34,592,369 | pack feed | followed by the pack as a feed in HiC |
| r/labrats | 733,237 | pack feed | followed by the pack as a feed in HiC |
| r/publichealth | 159,489 | pack feed | followed by the pack as a feed in HiC |
| r/healthcare | 112,943 | pack feed | followed by the pack as a feed in HiC |
| r/physicianassistant | 111,526 | pack feed | followed by the pack as a feed in HiC |
| r/CodingandBilling | 36,509 | pack feed | followed by the pack as a feed in HiC |
| r/epidemiology | 29,191 | pack feed | followed by the pack as a feed in HiC |
| r/HealthEconomics | 4,847 | pack feed | followed by the pack as a feed in HiC |
| r/therapists | 231,701 | HiC Suggest from goal | Mental health clinicians discuss AI therapy chatbots, automated session notes, and patient safety risks. |
| r/Psychiatry | 185,889 | HiC Suggest from goal | Mental health professionals discussing AI therapy chatbots, diagnostic tools, and patient safety. |
| r/Dentistry | 167,811 | HiC Suggest from goal | Dental practitioners discussing AI X-ray diagnostic tools and practice management software. |
| r/Veterinary | 86,794 | HiC Suggest from goal | Veterinarians detail the adoption of AI imaging, triage tools, and practice management software. |
| r/Dermatology | 82,829 | HiC Suggest from goal | Dermatologists debate computer vision lesion analysis, patient portal self-triage, and diagnostic accuracy. |
| r/pharmacology | 36,847 | HiC Suggest from goal | Researchers discussing AI-driven drug target discovery and pharmacovigilance. |
| r/epicsystems | 23,534 | HiC Suggest from goal | EHR analysts and clinicians post feedback on Epic's integrated generative AI and ambient tools. |
| r/Oncology | 12,839 | HiC Suggest from goal | Oncologists discuss clinical trial matching algorithms and AI pathology slide analysis. |
| r/MedTech | 8,265 | HiC Suggest from goal | Medical device engineers discussing FDA regulatory pathways for AI/ML software as medical devices. |
| r/ChatGPT | 11,763,199 | HiC Suggest from goal | Patients discussing using ChatGPT for interpreting lab results, symptom checking, and medical advice. |
| r/mentalhealth | 724,228 | HiC Suggest from goal | Consumers share first-person experiences using generative AI chatbots for self-guided emotional support. |
| r/ems | 203,469 | HiC Suggest from goal | Paramedics and EMTs share perspective on pre-hospital automated protocol guidance and remote triage. |
| r/ChronicIllness | 117,554 | HiC Suggest from goal | Patients share experiences using LLMs to research symptoms, decipher lab results, and navigate insurance. |
| r/disability | 114,441 | HiC Suggest from goal | Patients detail interactions with automated insurance prior authorization denials and accessibility tech. |
| r/cancer | 96,126 | HiC Suggest from goal | Patients and families discuss using AI tools to understand complex pathology reports and treatment options. |

Left out after Reddit's check: r/medicalhealthinformatics (not served (HTTP 404)); r/emr (restricted); r/digitalhealth (restricted); r/veterinaryprofessionals (not served (HTTP 404)); r/agingcare (5 members); r/healthcareservices (not served (HTTP 404)); r/alliedhealth (adult); r/healthadmin (not served (HTTP 302)); r/radiologytechnicians (not served (HTTP 302)); r/medialization (not served (HTTP 403)); r/artificialintelligence (not served (HTTP 404)); r/psychotherapy (not served (HTTP 403)); r/dentistryprofessionals (not served (HTTP 404)); r/hospitality (restricted); r/familycaregiver (restricted).

## Higher Ed

Audience: universities and colleges, faculty, students, advisors, admissions and IT leaders.

### Market-research questions

1. How are college students using AI for coursework, and what do they consider cheating?
2. How are faculty writing AI policies for their courses?
3. How do students use AI for career preparation, resumes and job search?
4. How are universities licensing AI tools such as ChatGPT Edu and Copilot for campus?
5. How are admissions offices using AI, and how do applicants use AI in essays?
6. How accurate are AI detectors, and what happens to students falsely accused?
7. How are academic advisors using AI to support students?
8. What do graduate students and researchers say about AI in research and writing?
9. How is AI changing assessment design and exams?
10. How are universities teaching AI literacy to students and staff?
11. How do first-generation and international students experience AI tools?
12. How is AI used in student retention and early alert systems?
13. What do instructional designers say about AI in course development?
14. How are campus IT and data governance teams handling AI risk?
15. How is AI affecting the value of a degree and enrollment decisions?
16. How are community colleges adopting AI for workforce programs?
17. How are co-op and internship programs preparing students for AI-changed jobs?
18. How do teaching assistants and adjuncts feel about AI's effect on their work?
19. How is AI used in financial aid and student services chatbots?
20. What do employers say about graduates' AI skills?
21. How are libraries and librarians responding to AI?
22. How do students with disabilities use AI tools for accessibility?
23. How is AI used in academic publishing and peer review?
24. How are university leaders budgeting and governing AI investments?
25. How do online programs and MOOCs use AI tutors?
26. What do alumni say about AI and lifelong learning needs?
27. How are computer science departments changing curricula because of AI?
28. How do students feel about AI's effect on their career prospects?
29. How is AI used in campus recruiting and student marketing?
30. What do parents of college students think about AI in education?

### Subreddits crawled (46)

| Subreddit | Members | Named by | Why it is crawled |
|---|---|---|---|
| r/ChatGPT | 11,763,199 | HiC Suggest from goal | Students and academics sharing specific prompts, workflows, and cheating detector bypasses. |
| r/careerguidance | 5,069,234 | HiC Suggest from goal and pack feed | Students and job seekers posting resume drafts generated by AI for critique and advice. |
| r/college | 2,938,485 | HiC Suggest from goal | General student experiences with AI coursework, policy reactions, and campus life. |
| r/Teachers | 2,449,888 | HiC Suggest from goal | Educators debating AI detection tools, essay grading, and academic integrity policies. |
| r/cscareerquestions | 2,408,089 | HiC Suggest from goal and pack feed | CS students discussing how AI coding tools impact entry-level hiring and curriculum relevance. |
| r/ApplyingToCollege | 1,357,654 | HiC Suggest from goal | Prospective students discussing AI use in admissions essays and application processes. |
| r/resumes | 1,329,064 | HiC Suggest from goal and pack feed | Students using AI resume builders and career preparation tools for post-grad jobs. |
| r/EngineeringStudents | 1,030,325 | HiC Suggest from goal and pack feed | Engineering students discussing AI tools for coursework, problem sets, and technical careers. |
| r/GradSchool | 949,532 | HiC Suggest from goal | Graduate students discussing AI research assistance, writing tools, and academic integrity. |
| r/csMajors | 470,193 | HiC Suggest from goal and pack feed | Computer science students discussing AI coding tools, curriculum changes, and job prospects. |
| r/Professors | 204,002 | HiC Suggest from goal | Faculty sharing real-world AI course policy enforcement, cheating incidents, and grading struggles. |
| r/CollegeRant | 114,846 | HiC Suggest from goal | Students venting about false AI detector accusations, Turnitin disputes, and course policies. |
| r/instructionaldesign | 63,377 | HiC Suggest from goal | Instructional designers detailing AI course integration, assessment redesign, and faculty training. |
| r/FinancialCareers | 1,785,791 | pack feed | followed by the pack as a feed in HiC |
| r/LawSchool | 953,707 | pack feed | followed by the pack as a feed in HiC |
| r/premed | 935,040 | pack feed | followed by the pack as a feed in HiC |
| r/forhire | 707,724 | pack feed | followed by the pack as a feed in HiC |
| r/UKJobs | 419,479 | pack feed | followed by the pack as a feed in HiC |
| r/consulting | 389,587 | pack feed | followed by the pack as a feed in HiC |
| r/MBA | 340,320 | pack feed | followed by the pack as a feed in HiC |
| r/EngineeringResumes | 170,526 | pack feed | followed by the pack as a feed in HiC |
| r/internships | 151,804 | pack feed | followed by the pack as a feed in HiC |
| r/OpenAI | 2,912,010 | HiC Suggest from goal | Students and faculty discussing practical use cases of ChatGPT Edu and custom GPTs. |
| r/jobs | 2,877,197 | HiC Suggest from goal | Recent graduates reflecting on AI's impact on entry-level job markets and hiring. |
| r/ClaudeAI | 1,315,570 | HiC Suggest from goal | Students and academics comparing Claude for long-form paper writing and complex reasoning tasks. |
| r/ITCareerQuestions | 577,997 | HiC Suggest from goal | Higher ed IT professionals and staff discussing campus software licensing and security policies. |
| r/PhD | 297,873 | HiC Suggest from goal | PhD candidates debating AI in peer review, literature reviews, and dissertation writing. |
| r/analytics | 287,882 | HiC Suggest from goal | Higher ed data analysts detail early alert systems, retention modeling, and administrative AI deployments. |
| r/education | 248,408 | HiC Suggest from goal | Broader educational policy discussions including campus AI adoption, ethics, and workforce readiness. |
| r/humanresources | 245,404 | HiC Suggest from goal | Campus HR and university hiring teams evaluating AI tools for administrative workflows. |
| r/AcademicPsychology | 191,172 | HiC Suggest from goal | Academic researchers and TAs sharing experiences with AI writing tools and review. |
| r/Libraries | 160,466 | HiC Suggest from goal | Academic librarians discussing AI research tools, information literacy, and database licensing. |
| r/disability | 114,441 | HiC Suggest from goal | Students with disabilities sharing how AI speech, text, and assistance tools aid learning. |
| r/cissp | 98,172 | HiC Suggest from goal | Higher ed IT security professionals discuss campus data privacy, AI governance, and shadow AI risks. |
| r/edtech | 43,030 | HiC Suggest from goal | EdTech professionals discussing AI tutor adoption, enterprise tools, and campus software. |
| r/accessibility | 22,495 | HiC Suggest from goal | Disabled students and accessibility specialists using AI for assistive learning technologies. |
| r/OnlineEducation | 21,586 | HiC Suggest from goal | Online instructors and students experiencing AI tutors, automated grading, and MOOCs. |
| r/Copilot | 10,735 | HiC Suggest from goal | IT admins and students sharing experiences with campus-wide Microsoft Copilot deployments. |
| r/recruiting | 223,393 | HiC Suggest from goal | Recruiters evaluating recent college graduates' AI skills and AI-driven hiring tools. |
| r/InternationalStudents | 56,406 | HiC Suggest from goal | International students using AI for language translation and academic writing support. |
| r/financialaid | 27,743 | HiC Suggest from goal | Students and administrators navigating financial aid processes and automated support systems. |
| r/Adjuncts | 13,251 | HiC Suggest from goal | Adjunct professors discussing workload impact, uncompensated AI policy creation, and online grading. |
| r/OnlineLearning | 11,933 | HiC Suggest from goal | Distance learners reporting experiences with AI proctored exams and automated teaching assistants. |
| r/communitycollege | 10,789 | HiC Suggest from goal | Community college faculty and students adopting AI in workforce and vocational programs. |
| r/datagovernance | 2,008 | HiC Suggest from goal | IT leaders discussing enterprise higher ed data privacy, student data protection, and AI risk. |
| r/pedagogy | 1,965 | HiC Suggest from goal | Teaching professionals analyzing structural changes to assignment design in response to AI. |

Left out after Reddit's check: r/professor (restricted); r/highered (restricted); r/academicit (not served (HTTP 302)); r/scholars (85 members); r/instructionaldesigners (not served (HTTP 404)); r/applytocollege (5 members); r/gradstudents (restricted); r/faculty (restricted); r/chatgptineducation (not served (HTTP 404)); r/academiclibrarians (restricted); r/firstgencollege (5 members); r/syllabi (not served (HTTP 302)); r/teachingassistants (restricted); r/apprenticeships (restricted); r/freshgrad (restricted).

## Insurance

Audience: insurers, agents and brokers, claims adjusters, underwriters, actuaries and policyholders.

### Market-research questions

1. How are insurers using AI in claims handling, and how do policyholders react?
2. How are underwriters using AI for risk selection and pricing?
3. How do insurance agents and brokers use AI tools to sell and service policies?
4. How do customers feel about AI chatbots for insurance quotes and claims?
5. How is AI used to detect insurance fraud?
6. What regulations (NAIC model bulletin, state laws) govern AI in insurance?
7. How are health insurers using AI for prior authorization and claim denials?
8. How is AI used in auto insurance telematics and usage-based pricing?
9. How are property insurers using AI and aerial imagery for roof and wildfire risk?
10. What do claims adjusters say about AI changing their jobs?
11. How are actuaries using machine learning and generative AI?
12. How is AI used in life insurance underwriting without medical exams?
13. What bias and fairness concerns arise with AI pricing in insurance?
14. How are insurtechs differentiating with AI?
15. How do independent agencies adopt AI with small staffs?
16. How is AI used in commercial insurance submissions and broker workflows?
17. How are insurers insuring AI risks for businesses (AI liability coverage)?
18. What are policyholder complaints about AI-driven claim decisions?
19. How is AI used in catastrophe modeling and climate risk?
20. How are insurers using AI for customer retention and cross-selling?
21. How is generative AI used in policy document and contract review?
22. What do insurance call center workers say about AI?
23. How are reinsurers using AI?
24. How is AI used in workers' compensation claims management?
25. How do consumers compare insurers using AI comparison tools?
26. What results have carriers reported from AI in claims cycle time?
27. How are insurance regulators examining AI models?
28. How is AI used in pet, travel and specialty insurance?
29. What are the biggest AI controversies in insurance?
30. How are insurers training staff for AI adoption?

### Subreddits crawled (37)

| Subreddit | Members | Named by | Why it is crawled |
|---|---|---|---|
| r/personalfinance | 21,906,189 | HiC Suggest from goal and pack feed | Policyholders sharing experiences with auto telematics, automated quotes, AI claims processing, and price increases. |
| r/smallbusiness | 2,572,290 | HiC Suggest from goal and pack feed | Business owners post complaints and experiences with commercial insurance online quotes and AI underwriting. |
| r/Insurance | 242,014 | HiC Suggest from goal and pack feed | Insurance professionals and consumers discussing industry operations, technology, claims, and policies. |
| r/HealthInsurance | 126,740 | HiC Suggest from goal and pack feed | Consumers and workers discussing health claim denials, prior authorization tools, and automated reviews. |
| r/actuary | 77,599 | HiC Suggest from goal and pack feed | Actuaries discussing predictive modeling, machine learning techniques, regulatory requirements, and technical workflows. |
| r/InsuranceAgent | 50,927 | HiC Suggest from goal and pack feed | Independent agents discuss daily adoption of AI quote generators, marketing, and client servicing tools. |
| r/adjusters | 17,529 | HiC Suggest from goal | Claims adjusters sharing direct experiences with AI claims processing, software changes, and workload. |
| r/InsuranceClaims | 9,731 | HiC Suggest from goal and pack feed | Claims adjusters and policyholders discussing real-world claims processes, disputes, and automated decisions. |
| r/Underwriting | 2,884 | HiC Suggest from goal | Underwriters discussing AI risk assessment tools, automated guidelines, aerial imagery, and pricing models. |
| r/InsurTech | 2,084 | HiC Suggest from goal and pack feed | Founders and tech professionals discussing AI innovation, startup tools, automated underwriting, and telematics. |
| r/humanresources | 245,404 | pack feed | followed by the pack as a feed in HiC |
| r/LifeInsurance | 42,318 | pack feed | followed by the pack as a feed in HiC |
| r/CodingandBilling | 36,509 | pack feed | followed by the pack as a feed in HiC |
| r/medicare | 27,674 | pack feed | followed by the pack as a feed in HiC |
| r/WorkersComp | 20,835 | pack feed | followed by the pack as a feed in HiC |
| r/legaladvice | 3,637,309 | HiC Suggest from goal | Policyholders seeking advice after AI-driven claim denials, automated liability decisions, or bad faith practices. |
| r/MachineLearning | 3,084,408 | HiC Suggest from goal | Data scientists detail technical architecture for actuarial models, computer vision, and fraud detection systems. |
| r/datascience | 2,775,884 | HiC Suggest from goal | Data scientists building insurance ML models, discussing telematics, risk selection, and algorithmic fairness. |
| r/nursing | 1,151,927 | HiC Suggest from goal | Nurses discussing prior authorization headaches and automated insurance denial algorithms. |
| r/FinancialPlanning | 991,885 | HiC Suggest from goal | Financial advisors discuss client reactions to automated life insurance underwriting and algorithmic pricing. |
| r/sales | 615,846 | HiC Suggest from goal | Commercial brokers discuss adopting generative AI for automated submission reviews and client outreach. |
| r/medicine | 574,534 | HiC Suggest from goal | Healthcare providers discussing AI-driven health insurance prior authorization hurdles and claim denial algorithms. |
| r/consulting | 389,587 | HiC Suggest from goal | Management consultants discuss enterprise AI transformation, carrier claims cycle time, and strategy. |
| r/analytics | 287,882 | HiC Suggest from goal | Data analysts in insurance sharing machine learning workflows and predictive risk models. |
| r/userexperience | 149,728 | HiC Suggest from goal | UX researchers share insights on designing customer-facing AI quote flows and insurance chatbots. |
| r/fintech | 100,178 | HiC Suggest from goal | Insurtech startups and developers discussing AI disruption in insurance underwriting and distribution. |
| r/CustomerService | 61,908 | HiC Suggest from goal | Frontline insurance representatives share unfiltered feedback on AI call assist and automation tools. |
| r/scrum | 46,769 | HiC Suggest from goal | Agile practitioners discuss corporate AI integration projects within traditional insurance enterprise systems. |
| r/legaltech | 36,645 | HiC Suggest from goal | Legal professionals discussing generative AI policy contract review and insurance compliance automation. |
| r/HealthTech | 16,579 | HiC Suggest from goal | Insurtech founders and healthcare innovators building AI for prior authorization and billing. |
| r/AutoInsurance | 1,449 | HiC Suggest from goal | Drivers discussing telematics tracking, usage-based insurance apps, and AI claims friction. |
| r/commercialinsurance | 1,074 | HiC Suggest from goal | Brokers and underwriters discussing commercial risk, underwriting automation, and enterprise policies. |
| r/cars | 7,445,704 | HiC Suggest from goal | Drivers share real-world experiences and privacy concerns regarding telematics and usage-based auto insurance. |
| r/RealEstate | 2,526,323 | HiC Suggest from goal | Property owners discuss non-renewals driven by aerial imagery AI and wildfire risk algorithms. |
| r/cybersecurity | 1,575,330 | HiC Suggest from goal | Security professionals discuss underwriting AI business risks and purchasing specialized AI liability policies. |
| r/remotework | 648,108 | HiC Suggest from goal | Insurance call center and operations staff sharing experiences with mandatory AI tools. |
| r/gis | 154,340 | HiC Suggest from goal | GIS professionals using aerial imagery and geospatial AI for wildfire risk and property insurance mapping. |

Left out after Reddit's check: r/insurancepro (not served (HTTP 404)); r/callcentre (not served (HTTP 404)); r/artificialintelligence (not served (HTTP 404)); r/healthinsurancepros (not served (HTTP 403)); r/legalprofs (not served (HTTP 302)); r/healthcareregulatory (not served (HTTP 302)); r/medicineuk (restricted); r/workcomp (not served (HTTP 404)); r/healthpolicy (restricted); r/ethicsofai (restricted); r/scamcheck (11 members); r/healthcarerant (not served (HTTP 302)); r/big4services (not served (HTTP 302)); r/cpcu (not served (HTTP 302)); r/regulatory (7 members); r/trucking (not served (HTTP 403)); r/carinsurance (not served (HTTP 404)); r/insurancepros (not served (HTTP 403)); r/riskmanagement (restricted).

## Retail & Commerce

Audience: retailers, brands, e-commerce sellers, store staff and shoppers.

### Market-research questions

1. How are shoppers using ChatGPT and AI assistants to research and buy products?
2. How are retailers deploying AI shopping assistants on their sites and apps?
3. How do shoppers feel about AI customer service in retail?
4. How is AI used in demand forecasting and inventory management?
5. How are retailers using AI for personalized recommendations and pricing?
6. What do store employees say about AI tools, self-checkout and scheduling?
7. How are Amazon sellers and Shopify merchants using AI for listings and ads?
8. How is AI changing search engine optimization and product discovery for brands?
9. How do consumers react to AI-generated product images and reviews?
10. How is AI used in loss prevention and shrink detection?
11. How are grocery retailers using AI and automation in stores and fulfillment?
12. How is agentic AI changing checkout and payments (agents buying for shoppers)?
13. How are retail media networks using AI for targeting?
14. How is AI used in supply chain and warehouse robotics?
15. How do small independent retailers adopt AI?
16. How is AI used in fashion trend forecasting and design?
17. What privacy concerns do shoppers have about AI personalization and in-store cameras?
18. How are retailers using AI in marketing content and email?
19. How is AI used in returns management and fraud?
20. How do consumers use AI price trackers and deal finders?
21. How is AI changing customer loyalty programs?
22. How are beauty and cosmetics brands using AI try-on and skin analysis?
23. How is AI used in restaurant and quick-service ordering?
24. What are the biggest AI customer experience failures in retail?
25. How are retail executives measuring ROI on AI?
26. How is AI used in merchandising and assortment planning?
27. How do shoppers trust AI product recommendations versus influencers and reviews?
28. How are dropshippers and DTC brands using AI?
29. How is AI affecting retail jobs and hiring?
30. How are retailers preparing for AI agents that compare prices across stores?

### Subreddits crawled (50)

| Subreddit | Members | Named by | Why it is crawled |
|---|---|---|---|
| r/Frugal | 6,899,148 | HiC Suggest from goal and pack feed | Deal-seeking shoppers discussing AI price trackers, coupon finders, and algorithmic discount tools. |
| r/malefashionadvice | 6,550,512 | HiC Suggest from goal and pack feed | Consumers discussing digital sizing guides, automated apparel recommendations, and virtual outfit matching. |
| r/femalefashionadvice | 5,837,259 | HiC Suggest from goal and pack feed | Shoppers giving feedback on AI sizing recommendations, virtual fittings, and algorithmic style recommendations. |
| r/Entrepreneur | 5,314,664 | HiC Suggest from goal and pack feed | Founders sharing ROI and efficiency gains from implementing AI across e-commerce operations. |
| r/SkincareAddiction | 5,050,944 | HiC Suggest from goal and pack feed | Skincare enthusiasts testing and discussing AI routine generators and virtual skin diagnostics. |
| r/smallbusiness | 2,572,290 | HiC Suggest from goal and pack feed | Small retail owners discussing adoption hurdles and budget tools for AI inventory and customer service. |
| r/ecommerce | 691,623 | HiC Suggest from goal and pack feed | Store owners discussing software integrations, AI customer support bots, and personalized recommendation engines. |
| r/SEO | 523,691 | HiC Suggest from goal and pack feed | SEO specialists analyzing how AI search tools like Perplexity and SGE impact product discovery. |
| r/DigitalMarketing | 480,785 | HiC Suggest from goal and pack feed | Marketers discussing AI email personalization, retail media networks, and automated content generation. |
| r/shopify | 387,463 | HiC Suggest from goal and pack feed | Shopify merchants sharing experiences with AI apps, automated customer service, and storefront personalization. |
| r/walmart | 379,284 | HiC Suggest from goal and pack feed | Walmart associates and customers sharing feedback on store tech, automated inventory scanners, and app features. |
| r/dropship | 363,653 | HiC Suggest from goal and pack feed | DTC store builders sharing practical usage of AI tools for product creative, copy, and customer ads. |
| r/PPC | 292,177 | HiC Suggest from goal and pack feed | Paid search marketers discussing AI-driven bid management and automated retail media ad campaigns. |
| r/Target | 235,345 | HiC Suggest from goal and pack feed | Target store employees and shoppers discussing self-checkout AI, in-store tech, and app personalization. |
| r/FulfillmentByAmazon | 147,272 | HiC Suggest from goal and pack feed | Amazon FBA sellers discussing AI listing generation, automated PPC management, and inventory tools. |
| r/supplychain | 119,625 | HiC Suggest from goal | Supply chain professionals discussing AI demand forecasting, warehouse automation, and inventory planning. |
| r/AmazonSeller | 100,495 | HiC Suggest from goal and pack feed | Amazon merchants sharing experiences with AI listing generators, PPC automation, and platform policies. |
| r/logistics | 77,289 | HiC Suggest from goal | Logistics managers sharing operational insights on warehouse robotics, routing algorithms, and fulfillment automation. |
| r/lossprevention | 68,148 | HiC Suggest from goal | Loss prevention officers discussing AI camera surveillance, shrink detection, and store security tech. |
| r/ecommercemarketing | 49,401 | HiC Suggest from goal | E-commerce operators discussing AI tools for product listings, ad copy, and conversion rate optimization. |
| r/retail | 35,230 | HiC Suggest from goal and pack feed | Retail industry professionals discussing store operations, shrink loss tech, and loss prevention AI. |
| r/MakeupAddiction | 7,634,352 | pack feed | followed by the pack as a feed in HiC |
| r/HomeImprovement | 4,856,428 | pack feed | followed by the pack as a feed in HiC |
| r/ThriftStoreHauls | 4,163,815 | pack feed | followed by the pack as a feed in HiC |
| r/BuyItForLife | 4,068,227 | pack feed | followed by the pack as a feed in HiC |
| r/povertyfinance | 2,965,705 | pack feed | followed by the pack as a feed in HiC |
| r/minimalism | 2,619,054 | pack feed | followed by the pack as a feed in HiC |
| r/socialmedia | 2,125,769 | pack feed | followed by the pack as a feed in HiC |
| r/marketing | 1,985,640 | pack feed | followed by the pack as a feed in HiC |
| r/Costco | 1,660,253 | pack feed | followed by the pack as a feed in HiC |
| r/InteriorDesign | 1,156,750 | pack feed | followed by the pack as a feed in HiC |
| r/Sephora | 1,100,794 | pack feed | followed by the pack as a feed in HiC |
| r/declutter | 760,794 | pack feed | followed by the pack as a feed in HiC |
| r/Flipping | 516,112 | pack feed | followed by the pack as a feed in HiC |
| r/digital_marketing | 384,139 | pack feed | followed by the pack as a feed in HiC |
| r/SocialMediaMarketing | 322,863 | pack feed | followed by the pack as a feed in HiC |
| r/FacebookAds | 279,515 | pack feed | followed by the pack as a feed in HiC |
| r/copywriting | 265,371 | pack feed | followed by the pack as a feed in HiC |
| r/EtsySellers | 262,774 | pack feed | followed by the pack as a feed in HiC |
| r/advertising | 262,178 | pack feed | followed by the pack as a feed in HiC |
| r/IKEA | 254,672 | pack feed | followed by the pack as a feed in HiC |
| r/Ulta | 169,971 | pack feed | followed by the pack as a feed in HiC |
| r/bigseo | 144,492 | pack feed | followed by the pack as a feed in HiC |
| r/HomeDepot | 133,580 | pack feed | followed by the pack as a feed in HiC |
| r/Lowes | 86,316 | pack feed | followed by the pack as a feed in HiC |
| r/TechSEO | 63,152 | pack feed | followed by the pack as a feed in HiC |
| r/woocommerce | 52,828 | pack feed | followed by the pack as a feed in HiC |
| r/Patagonia | 36,633 | pack feed | followed by the pack as a feed in HiC |
| r/AskRetail | 16,683 | pack feed | followed by the pack as a feed in HiC |
| r/Homegoods | 14,891 | pack feed | followed by the pack as a feed in HiC |

Left out after Reddit's check: r/fasteats (not served (HTTP 302)); r/artificialintelligence (not served (HTTP 404)); r/merchandising (restricted); r/etail (not served (HTTP 302)); r/fastfoodworkers (restricted); r/grocery (restricted); r/seowriting (not served (HTTP 404)); r/businessintelligence (restricted); r/onlineshopping (restricted); r/shoppingqueries (not served (HTTP 302)); r/allbirdsshoes (not served (HTTP 404)); r/bombas (not served (HTTP 403)); r/dtcmarketing (not served (HTTP 302)); r/potterybarn (not served (HTTP 403)); r/resellers (not served (HTTP 404)); r/retailmanagers (not served (HTTP 404)); r/contentmarketing (not served (HTTP 404)); r/restorationhardware (not served (HTTP 302)).

## Social Clubs & Membership Organizations

Audience: private clubs, country and golf clubs, associations, membership organizations and their members.

### Market-research questions

1. How are private clubs using AI in member services and communications?
2. How do club members feel about AI chatbots and automated concierge services?
3. How are country and golf clubs using AI for tee times, dining and scheduling?
4. How are associations using AI to grow and retain membership?
5. How is AI used for member engagement analytics and churn prediction?
6. What do club managers say about AI and staffing shortages?
7. How are membership organizations using AI for events and conferences?
8. How is AI used in club marketing and new member acquisition?
9. What privacy concerns do members raise about AI use of their data?
10. How are professional associations using AI in continuing education and certification?
11. How do younger members expect clubs to use technology and AI?
12. How is AI used in club food and beverage operations?
13. How are fitness clubs and gyms using AI coaching and member apps?
14. How are alumni associations and fraternal organizations using AI?
15. What club management software vendors are adding AI features?
16. How is AI used to personalize member experiences?
17. How do volunteer-run organizations adopt AI?
18. How are trade associations using AI for advocacy and member research?
19. How are clubs handling AI-generated content in newsletters and social media?
20. What are member complaints about technology changes at clubs?
21. How is AI used in dues pricing and financial planning for clubs?
22. How are churches and community organizations using AI for engagement?
23. How are hobby and enthusiast communities using AI?
24. How do boards of membership organizations govern AI use?
25. How is AI used in club facility maintenance and course management?
26. How are coworking and social membership clubs using AI?
27. What skills are club general managers developing for AI?
28. How is AI used in sports leagues and recreational clubs?
29. How are member-owned cooperatives using AI?
30. How is AI affecting the sense of community and personal service in clubs?

### Subreddits crawled (27)

| Subreddit | Members | Named by | Why it is crawled |
|---|---|---|---|
| r/golf | 1,819,275 | HiC Suggest from goal and pack feed | Golf club members express opinions on tee time booking tech and club amenities. |
| r/sailing | 840,949 | HiC Suggest from goal and pack feed | Yacht club members and officers share perspectives on club management software and membership tech. |
| r/nonprofit | 97,401 | HiC Suggest from goal and pack feed | Nonprofit and association leaders share experiences adopting tech and AI for member retention. |
| r/Toastmasters | 24,162 | HiC Suggest from goal and pack feed | Local club officers sharing experiences with member tracking and digital speech feedback tools. |
| r/CMA | 7,311 | HiC Suggest from goal | Club managers sharing operational challenges, vendor software updates, and AI implementation in private clubs. |
| r/churchtech | 6,971 | HiC Suggest from goal | Church tech operators discuss AI tools for community management, engagement, and administration. |
| r/Rotary | 3,122 | HiC Suggest from goal and pack feed | Service club members discussing volunteer retention, meeting logistics, and tech tools. |
| r/tennis | 2,151,343 | pack feed | followed by the pack as a feed in HiC |
| r/KitchenConfidential | 1,903,195 | pack feed | followed by the pack as a feed in HiC |
| r/Pickleball | 153,551 | pack feed | followed by the pack as a feed in HiC |
| r/Rowing | 138,907 | pack feed | followed by the pack as a feed in HiC |
| r/10s | 135,429 | pack feed | followed by the pack as a feed in HiC |
| r/freemasonry | 107,898 | pack feed | followed by the pack as a feed in HiC |
| r/squash | 41,306 | pack feed | followed by the pack as a feed in HiC |
| r/marketing | 1,985,640 | HiC Suggest from goal | Membership marketers sharing AI copy generation, churn prediction, and newsletter workflows. |
| r/salesforce | 118,952 | HiC Suggest from goal | Association CRM admins discussing Einstein AI, member churn scoring, and automation. |
| r/Frat | 86,254 | HiC Suggest from goal | Fraternal organization members discuss alumni engagement, technology adoption, and chapter administration. |
| r/restaurantowners | 64,866 | HiC Suggest from goal | Food and beverage directors in clubs discuss POS, AI scheduling, and service automation. |
| r/cooperatives | 28,194 | HiC Suggest from goal | Member-owned co-op board members discussing tech adoption and governance. |
| r/hubspot | 25,066 | HiC Suggest from goal | Membership organization marketers discussing automated onboarding emails and AI chatbots. |
| r/Turfmanagement | 15,837 | HiC Suggest from goal | Club facility and turf managers evaluate AI-driven course maintenance and technology. |
| r/CoWorking | 4,252 | HiC Suggest from goal | Coworking space operators share insights on community apps, automation, and member retention. |
| r/personalfinance | 21,906,189 | HiC Suggest from goal | Country club members discussing dues increases, assessment costs, and club value. |
| r/boardgames | 5,465,228 | HiC Suggest from goal | Hobby club organizers discuss community administration, event scheduling, and member communication tools. |
| r/smallbusiness | 2,572,290 | HiC Suggest from goal | Boutique facility owners discuss CRM, auto-responders, and membership management automation tools. |
| r/climbing | 1,641,996 | HiC Suggest from goal | Members of social climbing clubs voice feedback on member apps and automated check-ins. |
| r/SaaS | 853,254 | HiC Suggest from goal | Software vendors discuss building AI features for niche membership management and CRM platforms. |

Left out after Reddit's check: r/golfcourseops (not served (HTTP 302)); r/associations (not served (HTTP 404)); r/eventmanagement (restricted); r/fitnessindustry (11 members); r/gymowners (not served (HTTP 404)); r/churchexecutives (not served (HTTP 302)); r/hospitality (restricted); r/marketingprofs (not served (HTTP 404)); r/alumni (not served (HTTP 403)); r/cooperative (273 members); r/socialclubs (not served (HTTP 404)); r/eventtech (578 members); r/associationmanagement (not served (HTTP 404)); r/greeks (not served (HTTP 404)); r/recreation (restricted); r/businessofsports (36 members); r/golfcoursemanagement (not served (HTTP 302)); r/hospitalitymanagement (restricted).

## Travel, Tourism & Museums

Audience: airlines, hotels, travel agencies, destinations, museums, cultural institutions and travelers.

### Market-research questions

1. How are travelers using ChatGPT and AI to plan trips?
2. How are airlines using AI in customer service, pricing and disruption handling?
3. How do hotel guests feel about AI concierge and chatbots?
4. How are hotels using AI for revenue management and dynamic pricing?
5. How are online travel agencies (Expedia, Booking) adding AI trip planners?
6. What do travel agents say about AI replacing or helping them?
7. How are museums using AI for visitor engagement and interpretation?
8. How are museums and archives using AI for collections, cataloging and digitization?
9. How are destination marketing organizations using AI?
10. How is AI used in airport operations, security and baggage?
11. How do travelers trust AI-generated reviews and recommendations?
12. How is AI used in cruise lines and tour operators?
13. How are restaurants and attractions using AI for bookings?
14. What privacy concerns arise with biometrics and AI in travel?
15. How is AI used in travel insurance and trip disruption?
16. How are hospitality workers affected by AI and automation?
17. How is AI used in short-term rentals and Airbnb hosting?
18. How are cultural institutions handling AI-generated art and copyright?
19. How is AI used in theme parks and live entertainment venues?
20. How do business travelers and corporate travel managers use AI?
21. How is AI used for accessibility in travel and museums?
22. How do travelers react to AI errors in itineraries?
23. How are national parks and heritage sites using AI for crowd management?
24. How is AI used in loyalty programs for airlines and hotels?
25. What do museum educators say about AI in school programs?
26. How are small hotels and B&Bs adopting AI?
27. How is AI used in translation for international travelers?
28. How are tourism boards measuring AI's effect on visitor numbers?
29. How is AI affecting search and booking traffic for travel brands?
30. What are the biggest AI customer service failures in travel?

### Subreddits crawled (44)

| Subreddit | Members | Named by | Why it is crawled |
|---|---|---|---|
| r/travel | 14,518,696 | HiC Suggest from goal and pack feed | Travelers sharing real experiences with AI trip planning, itineraries, and booking tools. |
| r/ChatGPT | 11,763,199 | HiC Suggest from goal | Users frequently sharing custom prompts and threads for automated travel itinerary generation. |
| r/TravelHacks | 5,784,726 | HiC Suggest from goal and pack feed | Travelers discussing tech tricks, AI hacks, and automated tools for trip optimization. |
| r/solotravel | 4,597,800 | HiC Suggest from goal and pack feed | Solo travelers actively using AI tools for safety, routing, and travel itineraries. |
| r/JapanTravel | 3,536,216 | HiC Suggest from goal and pack feed | Destinations-specific travelers heavily relying on automated translation apps and AI routing engines. |
| r/aviation | 2,856,190 | HiC Suggest from goal and pack feed | Aviation professionals discussing airline operational software, dispatch automation, and baggage routing. |
| r/digitalnomad | 2,436,259 | HiC Suggest from goal and pack feed | Remote workers discussing AI travel tools, translation apps, and long-term stay logistics. |
| r/delta | 447,300 | HiC Suggest from goal and pack feed | Frequent flyers sharing feedback on airline AI chatbots, app features, and biometric boarding. |
| r/AirBnB | 398,670 | HiC Suggest from goal and pack feed | Guests and hosts share experiences with automated messaging, AI dynamic pricing, and guest screening. |
| r/unitedairlines | 281,939 | HiC Suggest from goal and pack feed | Passengers discussing automated customer service, rebooking algorithms, and digital tools. |
| r/rollercoasters | 154,736 | HiC Suggest from goal and pack feed | Theme park operators and enthusiasts discussing virtual queue algorithms and attraction management tech. |
| r/flightattendants | 70,348 | HiC Suggest from goal and pack feed | Airline crew discussing customer service automation, airport gate tech, and disruption impacts. |
| r/hotels | 55,053 | HiC Suggest from goal and pack feed | Hotel staff and managers discuss operational tech, revenue management tools, and AI guest software. |
| r/MuseumPros | 54,237 | HiC Suggest from goal and pack feed | Museum staff discussing AI for collections, digital curation, archiving, and visitor engagement. |
| r/travelagents | 29,239 | HiC Suggest from goal and pack feed | Professional travel agents discussing AI competition, automated planning tools, and workflow integration. |
| r/AirBnBHosts | 28,563 | HiC Suggest from goal | Short-term rental hosts using AI for automated guest communication, pricing, and messaging. |
| r/Museums | 5,690 | HiC Suggest from goal | Museum professionals and visitors discussing exhibit tech, AI interpretation, and digital art. |
| r/vrbohosts | 4,965 | HiC Suggest from goal | Vacation rental hosts sharing experiences with automated pricing tools and guest AI interactions. |
| r/backpacking | 5,534,213 | pack feed | followed by the pack as a feed in HiC |
| r/Shoestring | 5,205,023 | pack feed | followed by the pack as a feed in HiC |
| r/Cruise | 1,552,404 | pack feed | followed by the pack as a feed in HiC |
| r/Disneyland | 1,550,548 | pack feed | followed by the pack as a feed in HiC |
| r/onebag | 965,697 | pack feed | followed by the pack as a feed in HiC |
| r/WaltDisneyWorld | 796,639 | pack feed | followed by the pack as a feed in HiC |
| r/awardtravel | 615,914 | pack feed | followed by the pack as a feed in HiC |
| r/royalcaribbean | 177,013 | pack feed | followed by the pack as a feed in HiC |
| r/Flights | 176,483 | pack feed | followed by the pack as a feed in HiC |
| r/UniversalOrlando | 142,197 | pack feed | followed by the pack as a feed in HiC |
| r/privacy | 1,688,254 | HiC Suggest from goal | Discussions on facial recognition at airports, TSA biometrics, and passenger tracking data. |
| r/TalesFromTheFrontDesk | 1,057,310 | HiC Suggest from goal | Hotel front desk staff discussing automated check-in kiosks, AI chatbots, and guest reactions. |
| r/TalesFromYourServer | 641,437 | HiC Suggest from goal | Restaurant and hospitality staff discuss automated booking systems, AI POS tech, and operational changes. |
| r/consulting | 389,587 | HiC Suggest from goal | Travel and hospitality industry consultants share enterprise AI implementation trends and enterprise strategy. |
| r/nationalparks | 264,606 | HiC Suggest from goal | Park visitors and rangers discussing automated reservation systems and crowd management technology. |
| r/Libraries | 160,466 | HiC Suggest from goal | Archivists and librarians discussing AI metadata tagging, cataloging, and document digitization. |
| r/americanairlines | 159,054 | HiC Suggest from goal | Flyers giving feedback on airline app features, customer support bots, and pricing. |
| r/marriott | 154,567 | HiC Suggest from goal | Hotel guests discussing mobile check-in, keyless entry, dynamic pricing, and digital concierges. |
| r/Hilton | 91,503 | HiC Suggest from goal | Hilton guests discussing digital key features, automated room selection, and customer service bots. |
| r/restaurantowners | 64,866 | HiC Suggest from goal | Restaurateurs discussing AI reservation management, automated phone answering, and yield pricing. |
| r/Cruises | 26,610 | HiC Suggest from goal | Cruise passengers discussing automated booking systems, facial recognition embarkation, and AI concierges. |
| r/disneyvacationclub | 7,559 | HiC Suggest from goal | Disney parkgoers discussing virtual queues, Genie+ algorithms, and app-based itinerary optimization. |
| r/techsupport | 3,470,614 | HiC Suggest from goal | End users and travelers report software bugs and AI booking chatbot failures. |
| r/ArtHistory | 386,216 | HiC Suggest from goal | Art historians debating AI image attribution, digital restoration, and archival authenticity. |
| r/ProductManagement | 287,316 | HiC Suggest from goal | Product managers at travel companies share insights on building AI trip planners and booking engines. |
| r/usajobs | 207,199 | HiC Suggest from goal | Federal park rangers and cultural resource workers discuss technology implementation in national parks. |

Left out after Reddit's check: r/shoestringtravel (not served (HTTP 302)); r/hospitality (restricted); r/hotelowners (restricted); r/flyertalk (not served (HTTP 403)); r/artcritics (not served (HTTP 302)); r/archivism (not served (HTTP 404)); r/tourguides (restricted); r/chepflight (not served (HTTP 302)); r/businesstraveler (not served (HTTP 403)); r/disabledtravel (not served (HTTP 404)); r/travelitinerary (7 members); r/promptsharing (restricted); r/corporatetravel (381 members); r/museums_and_galleries (not served (HTTP 302)); r/customerrelations (not served (HTTP 404)); r/realtravelagents (not served (HTTP 302)); r/asktsa (not served (HTTP 302)); r/themeparks (726 members).

## Workforce & Careers

Audience: workers, job seekers, HR and talent leaders, workforce boards and career services.

### Market-research questions

1. How is AI changing job search, and what do job seekers say about AI screening?
2. Which jobs are workers most worried AI will replace?
3. How are employers using AI in hiring, and how do candidates feel about it?
4. How are workers using ChatGPT and copilots at work, with or without permission?
5. How is AI changing entry-level jobs and early-career hiring?
6. How are HR teams using AI for performance reviews and people analytics?
7. What reskilling and upskilling programs help workers adapt to AI?
8. How do managers feel about AI monitoring of employees?
9. How are workforce development boards and community colleges responding to AI?
10. How is AI affecting freelancers and gig workers?
11. What do unions say about AI in the workplace?
12. How are career coaches and career centers using AI?
13. How is AI changing remote work and productivity expectations?
14. How do workers feel about AI-written job descriptions and automated rejections?
15. How are companies writing AI acceptable-use policies for employees?
16. How is AI affecting wages and job quality?
17. How are older workers adapting to AI tools?
18. How is AI used in employee onboarding and training?
19. What skills do employers say matter most in an AI economy?
20. How do recruiters use AI to source candidates?
21. How are laid-off tech workers finding jobs in an AI-changed market?
22. How is AI affecting customer service and call center jobs?
23. How are apprenticeships and trades affected by AI?
24. How do employees view AI's effect on burnout and workload?
25. What regulations govern AI in employment decisions?
26. How are companies measuring productivity gains from AI?
27. How is AI changing internal mobility and career paths?
28. How do workers detect and respond to AI interviews?
29. How is AI used in workplace safety?
30. How do new graduates feel about starting careers in an AI economy?

### Subreddits crawled (50)

| Subreddit | Members | Named by | Why it is crawled |
|---|---|---|---|
| r/ChatGPT | 11,763,199 | HiC Suggest from goal | Knowledge workers sharing unsanctioned and official workplace use cases for generative AI. |
| r/careerguidance | 5,069,234 | HiC Suggest from goal and pack feed | Career coaches and seekers discussing AI resume builders, upskilling, and changing job market expectations. |
| r/singularity | 4,030,667 | HiC Suggest from goal | Workers and tech enthusiasts debate AI job displacement, automation, and workforce implications. |
| r/jobs | 2,877,197 | HiC Suggest from goal and pack feed | Job seekers sharing firsthand experiences with AI screening, automated rejections, and modern hiring tools. |
| r/cscareerquestions | 2,408,089 | HiC Suggest from goal and pack feed | Software engineers and entry-level devs discussing AI-driven hiring market shifts and job automation. |
| r/FinancialCareers | 1,785,791 | HiC Suggest from goal and pack feed | Finance professionals discussing automated modeling, entry-level analyst role changes, and AI productivity. |
| r/recruitinghell | 1,551,785 | HiC Suggest from goal and pack feed | Job seekers sharing firsthand experiences with AI resume screening, automated rejections, and video interviews. |
| r/resumes | 1,329,064 | HiC Suggest from goal and pack feed | Applicants actively troubleshooting AI resume screeners (ATS) and using AI writing assistants. |
| r/ClaudeAI | 1,315,570 | HiC Suggest from goal | Professionals detail how they deploy Claude for coding, writing, and workplace automation. |
| r/Accounting | 1,301,427 | HiC Suggest from goal and pack feed | Accountants evaluate AI audit tools, automated bookkeeping, and entry-level task automation. |
| r/freelance | 708,671 | HiC Suggest from goal | Freelancers debating how generative AI impacts client demand, pricing, and project scope. |
| r/overemployed | 684,768 | HiC Suggest from goal and pack feed | Multiple-job holders leveraging LLMs and automation to multiply daily work output. |
| r/remotework | 648,108 | HiC Suggest from goal and pack feed | Remote workers discussing productivity tracking, AI surveillance, and shifting output expectations. |
| r/PromptEngineering | 431,798 | HiC Suggest from goal | Knowledge workers share practical workflows and ChatGPT prompts used for daily work productivity. |
| r/ExperiencedDevs | 427,719 | HiC Suggest from goal | Senior engineers discussing practical AI copilot usage at work and corporate AI acceptable-use policies. |
| r/consulting | 389,587 | HiC Suggest from goal and pack feed | Management consultants deploying AI tools internally and advising enterprise clients on AI workforce changes. |
| r/humanresources | 245,404 | HiC Suggest from goal | HR professionals detailing AI policy creation, performance management tools, and workplace compliance. |
| r/recruiting | 223,393 | HiC Suggest from goal and pack feed | Recruiters discussing AI candidate sourcing, automated screening algorithms, and talent acquisition technology. |
| r/Layoffs | 199,605 | HiC Suggest from goal and pack feed | Impacted workers sharing post-layoff job hunt struggles in an AI-heavy hiring environment. |
| r/Copilot | 10,735 | HiC Suggest from goal | Enterprise workers discuss Microsoft Copilot integration, productivity expectations, and corporate rollout. |
| r/antiwork | 3,025,403 | pack feed | followed by the pack as a feed in HiC |
| r/datascience | 2,775,884 | pack feed | followed by the pack as a feed in HiC |
| r/financialindependence | 2,466,425 | pack feed | followed by the pack as a feed in HiC |
| r/digitalnomad | 2,436,259 | pack feed | followed by the pack as a feed in HiC |
| r/AskHR | 1,853,814 | pack feed | followed by the pack as a feed in HiC |
| r/sysadmin | 1,356,218 | pack feed | followed by the pack as a feed in HiC |
| r/LinkedInLunatics | 1,110,448 | pack feed | followed by the pack as a feed in HiC |
| r/EngineeringStudents | 1,030,325 | pack feed | followed by the pack as a feed in HiC |
| r/LawSchool | 953,707 | pack feed | followed by the pack as a feed in HiC |
| r/premed | 935,040 | pack feed | followed by the pack as a feed in HiC |
| r/careeradvice | 892,467 | pack feed | followed by the pack as a feed in HiC |
| r/WorkReform | 827,564 | pack feed | followed by the pack as a feed in HiC |
| r/WorkOnline | 779,820 | pack feed | followed by the pack as a feed in HiC |
| r/forhire | 707,724 | pack feed | followed by the pack as a feed in HiC |
| r/sales | 615,846 | pack feed | followed by the pack as a feed in HiC |
| r/ITCareerQuestions | 577,997 | pack feed | followed by the pack as a feed in HiC |
| r/jobsearchhacks | 572,206 | pack feed | followed by the pack as a feed in HiC |
| r/Salary | 534,488 | pack feed | followed by the pack as a feed in HiC |
| r/csMajors | 470,193 | pack feed | followed by the pack as a feed in HiC |
| r/UKJobs | 419,479 | pack feed | followed by the pack as a feed in HiC |
| r/MBA | 340,320 | pack feed | followed by the pack as a feed in HiC |
| r/projectmanagement | 244,413 | pack feed | followed by the pack as a feed in HiC |
| r/EngineeringResumes | 170,526 | pack feed | followed by the pack as a feed in HiC |
| r/Big4 | 155,196 | pack feed | followed by the pack as a feed in HiC |
| r/internships | 151,804 | pack feed | followed by the pack as a feed in HiC |
| r/workfromhome | 144,148 | pack feed | followed by the pack as a feed in HiC |
| r/negotiation | 26,594 | pack feed | followed by the pack as a feed in HiC |
| r/graphic_design | 2,943,232 | HiC Suggest from goal | Designers sharing how generative image tools alter entry-level work and creative career paths. |
| r/work | 312,389 | HiC Suggest from goal | General employees post about office policies, workload expectations, burnout, and management tactics. |
| r/managers | 298,319 | HiC Suggest from goal | People managers discuss employee performance tracking, productivity measurement, and AI adoption policies. |

Left out after Reddit's check: r/workplace (not served (HTTP 403)); r/callcentre (not served (HTTP 404)); r/artificialintelligence (not served (HTTP 404)); r/trades (811 members); r/recruiter (restricted); r/interviewing (restricted); r/talentacquisition (restricted); r/entrylevel (restricted); r/gradstudents (restricted); r/translators (restricted); r/peopleanalytics (restricted); r/techemployers (not served (HTTP 302)); r/highered (restricted); r/apprenticeships (restricted); r/freshgrad (restricted).

## AI Trends

Audience: AI practitioners, product leaders, developers, investors and enterprise buyers.

### Market-research questions

1. What are enterprises actually deploying with generative AI, and what results do they see?
2. Which AI models and vendors are businesses choosing, and why?
3. How are AI agents being used in production, and what fails?
4. What do developers say about AI coding assistants?
5. How are companies managing AI costs and token spend?
6. What are the main AI governance and risk practices in enterprises?
7. How are open-weight models used compared with closed APIs?
8. What do users say about hallucinations and reliability of AI tools?
9. How is AI regulation (EU AI Act, US states) affecting product plans?
10. What AI startups and funding trends matter this quarter?
11. How are companies building retrieval-augmented and agentic systems?
12. What do product managers say about building AI features users want?
13. How is AI affecting search, SEO and web traffic?
14. What are the security risks of AI (prompt injection, data leakage)?
15. How are small businesses adopting AI tools?
16. What AI hardware and chip trends affect availability and price?
17. How are AI copilots changing knowledge work?
18. What benchmarks and evaluations do practitioners trust?
19. How are companies training staff to use AI?
20. What are the ethical debates in AI this month?
21. How are local and on-device AI models being used?
22. What do consumers think of AI features in phones and apps?
23. How is AI changing customer experience and contact centers?
24. What are the biggest AI product launches and how were they received?
25. How are AI data centers affecting energy and communities?
26. How do companies measure ROI from AI projects?
27. What are common reasons AI pilots fail to reach production?
28. How is multimodal AI (voice, image, video) being adopted?
29. What do AI researchers say about progress and limits?
30. How are AI tools affecting creative and media industries?

### Subreddits crawled (41)

| Subreddit | Members | Named by | Why it is crawled |
|---|---|---|---|
| r/ChatGPT | 11,763,199 | HiC Suggest from goal | End-user and prosumer experiences, prompt techniques, reliability feedback, and feature releases. |
| r/MachineLearning | 3,084,408 | HiC Suggest from goal | ML researchers and engineers discussing model benchmarks, paper implementations, and fundamental progress. |
| r/datascience | 2,775,884 | HiC Suggest from goal | Enterprise data scientists discussing ROI, model evaluation, production pipelines, and career shifts. |
| r/cybersecurity | 1,575,330 | HiC Suggest from goal | Security professionals analyzing AI prompt injection, data leakage, shadow AI, and governance compliance. |
| r/artificial | 1,365,584 | HiC Suggest from goal | Practitioners and industry observers discussing technical breakthroughs, product launches, and societal impact. |
| r/sysadmin | 1,356,218 | HiC Suggest from goal | IT admins managing enterprise AI copilot rollouts, endpoint security, and software licensing. |
| r/ClaudeAI | 1,315,570 | HiC Suggest from goal | Users and developers discussing Claude models, API performance, artifacts, and coding capabilities. |
| r/LocalLLaMA | 885,569 | HiC Suggest from goal | Open-weight model deployments, fine-tuning, local hardware specs, and self-hosted AI architecture. |
| r/SEO | 523,691 | HiC Suggest from goal | SEO specialists tracking AI search overviews, organic web traffic declines, and AI-generated content. |
| r/devops | 523,461 | HiC Suggest from goal | Infrastructure engineers handling AI model deployment, GPU clusters, latency, and cloud infrastructure. |
| r/PromptEngineering | 431,798 | HiC Suggest from goal | Practitioners optimizing system prompts, context windows, and techniques to minimize model hallucinations. |
| r/aws | 400,425 | HiC Suggest from goal | Cloud architects deploying Bedrock, managed AI services, GPU instances, and cloud cost management. |
| r/ProductManagement | 287,316 | HiC Suggest from goal | PMs discussing integration of AI features, measuring user demand, and product strategy ROI. |
| r/AZURE | 218,557 | HiC Suggest from goal | Enterprise cloud engineers implementing Azure OpenAI services, security perimeters, and corporate compliance. |
| r/SoftwareEngineering | 176,483 | HiC Suggest from goal | Senior engineers evaluating AI coding assistants like Copilot/Cursor and code quality impacts. |
| r/ollama | 145,512 | HiC Suggest from goal | Developers and power users running local models sharing hardware benchmarks, deployment tips, and performance. |
| r/LangChain | 111,637 | HiC Suggest from goal | Developers building agentic workflows, RAG pipelines, and LLM application architectures in production. |
| r/hardware | 4,376,531 | HiC Suggest from goal | Hardware enthusiasts discussing GPU supply chains, AI accelerator chips, and data center hardware. |
| r/singularity | 4,030,667 | HiC Suggest from goal | Speculative discussions on AGI timelines, societal impacts, and cutting-edge frontier model capabilities. |
| r/graphic_design | 2,943,232 | HiC Suggest from goal | Designers debating generative image tools, client expectations, and ethical issues around AI art. |
| r/smallbusiness | 2,572,290 | HiC Suggest from goal | Small business owners sharing practical adoption of low-cost AI tools for operations. |
| r/cscareerquestions | 2,408,089 | HiC Suggest from goal | Software developers sharing how AI automation impacts job security, hiring, and daily workflows. |
| r/startups | 2,155,991 | HiC Suggest from goal | Founders evaluating AI vendor costs, building AI-first MVPs, and raising seed capital. |
| r/midjourney | 1,789,226 | HiC Suggest from goal | Creative professionals and artists sharing experiences, workflows, and quality of generative image models. |
| r/netsec | 579,292 | HiC Suggest from goal | Security professionals analyzing prompt injection, LLM vulnerabilities, and enterprise data leakage risks. |
| r/dataengineering | 487,539 | HiC Suggest from goal | Data engineers discussing vector databases, ETL pipelines, and infrastructure supporting enterprise LLM applications. |
| r/consulting | 389,587 | HiC Suggest from goal | Enterprise consultants sharing insights on client AI transformation budgets and pilot failures. |
| r/energy | 301,414 | HiC Suggest from goal | Energy industry watchers discussing AI data center electricity demand, grid constraints, and sustainability. |
| r/copywriting | 265,371 | HiC Suggest from goal | Marketing writers sharing real-world impact of AI tools on freelance rates and workflow efficiency. |
| r/humanresources | 245,404 | HiC Suggest from goal | HR leaders managing employee AI usage policies, training programs, and internal AI guidelines. |
| r/comfyui | 221,817 | HiC Suggest from goal | Advanced image generation creators building customized local workflows, LoRAs, and control nets. |
| r/salesforce | 118,952 | HiC Suggest from goal | Enterprise CRM admins and developers evaluating integrated enterprise AI agents and copilot tools. |
| r/googlecloud | 101,440 | HiC Suggest from goal | Engineers deploying Gemini APIs, Vertex AI, and Google Cloud infrastructure for machine learning. |
| r/fintech | 100,178 | HiC Suggest from goal | Financial tech professionals discussing AI fraud detection, credit scoring, and regulatory compliance. |
| r/datacenter | 48,355 | HiC Suggest from goal | Infrastructure specialists discussing AI cluster power requirements, cooling tech, and compute hardware constraints. |
| r/legaltech | 36,645 | HiC Suggest from goal | Legal professionals discussing AI governance, regulation compliance, and enterprise risk management. |
| r/technology | 20,651,921 | HiC Suggest from goal | General public discussions around major AI product announcements, EU AI Act, and societal debates. |
| r/stocks | 9,427,652 | HiC Suggest from goal | Retail investors discussing public AI chip companies, hyperscaler capex spend, and stock performance. |
| r/algotrading | 1,902,248 | HiC Suggest from goal | Quantitative traders using AI models for financial forecasting and trading execution. |
| r/selfhosted | 875,745 | HiC Suggest from goal | Tech enthusiasts sharing practical experiences deploying open-weight models on private home or office infrastructure. |
| r/CIO | 19,732 | HiC Suggest from goal | Enterprise IT leaders discussing AI governance, vendor evaluations, compliance, and enterprise software budgets. |

Left out after Reddit's check: r/artificialintelligence (not served (HTTP 404)); r/vancouvertech (not served (HTTP 302)); r/vcs (not served (HTTP 403)); r/big4softech (not served (HTTP 302)); r/programmableweb (not served (HTTP 302)); r/callcentre (not served (HTTP 404)); r/llama_index (not served (HTTP 302)); r/cto (restricted); r/vibeing (restricted).

## Academic & Analyst

Audience: academic researchers, analysts, economists and research librarians studying AI.

### Market-research questions

1. What does recent academic research find about AI's effect on worker productivity?
2. What do economists say about AI and the labor market?
3. How are researchers measuring AI adoption across industries?
4. What studies show the accuracy and reliability of large language models?
5. What does research say about AI in education outcomes?
6. What does research find about AI bias and fairness?
7. How are researchers using AI in their own research workflows?
8. What do analysts forecast for AI market size and spending?
9. What studies examine public trust in AI?
10. What research covers AI in healthcare outcomes?
11. What are the debates about AI-generated papers and peer review?
12. What does research say about AI and misinformation?
13. How do social scientists study AI's effect on society?
14. What does research find about AI and creativity?
15. What are the latest findings on AI safety and alignment?
16. What do survey studies say about consumer use of AI assistants?
17. What research examines AI's energy and environmental costs?
18. How are research libraries handling AI tools and licensing?
19. What does research say about AI in customer service quality?
20. What studies examine AI and small business performance?
21. What do graduate students and postdocs say about AI in academia?
22. What research covers AI regulation effectiveness?
23. What studies look at AI and inequality?
24. What are the replication and methodology debates in AI research?
25. What do analysts say about generative AI ROI in enterprises?
26. What research covers AI in scientific discovery?
27. How do statisticians and data scientists critique AI claims?
28. What research covers AI in law and legal services?
29. What studies examine children's and teens' use of AI?
30. What does research find about AI companions and mental health?

### Subreddits crawled (37)

| Subreddit | Members | Named by | Why it is crawled |
|---|---|---|---|
| r/Economics | 5,786,851 | HiC Suggest from goal | Economists discussing studies on AI labor market impacts, productivity, and macroeconomic modeling. |
| r/MachineLearning | 3,084,408 | HiC Suggest from goal | ML practitioners and researchers discussing state-of-the-art methodology, safety, and model reliability research. |
| r/datascience | 2,775,884 | HiC Suggest from goal | Data scientists and statisticians critiquing AI claims, enterprise ROI, and methodology rigor. |
| r/GradSchool | 949,532 | HiC Suggest from goal | Graduate students discussing AI tool adoption, writing assistance, and academic integrity policies. |
| r/LocalLLaMA | 885,569 | HiC Suggest from goal | Open-source AI researchers and practitioners testing model reliability, hardware costs, and benchmarking performance. |
| r/quant | 211,819 | HiC Suggest from goal | Quantitative analysts and financial economists evaluating AI model accuracy, forecasting, and ROI. |
| r/Professors | 204,002 | HiC Suggest from goal | Faculty sharing experiences with AI in pedagogy, peer review, and research workflows. |
| r/AcademicPsychology | 191,172 | HiC Suggest from goal | Academic psychologists discussing AI bias, cognitive effects, mental health impacts, and human research methodology. |
| r/machinelearningnews | 159,039 | HiC Suggest from goal | Practitioners and researchers discussing new paper releases, safety findings, and technical replication debates. |
| r/librarians | 52,619 | HiC Suggest from goal | Academic research librarians discussing AI tool licensing, information literacy, and database integrations. |
| r/academiceconomics | 48,239 | HiC Suggest from goal | Academic economists analyzing empirical labor market studies, productivity data, and macro AI impact. |
| r/edtech | 43,030 | HiC Suggest from goal | Educators and academic researchers reporting empirical AI outcomes and classroom tool adoption. |
| r/legaltech | 36,645 | HiC Suggest from goal | Legal analysts and practitioners examining AI adoption, enterprise software ROI, and regulatory policy. |
| r/HealthInformatics | 15,766 | HiC Suggest from goal | Healthcare researchers and clinical analysts evaluating AI reliability, data privacy, and medical outcomes. |
| r/AIsafety | 4,718 | HiC Suggest from goal | Researchers and policy analysts debating AI alignment risks, governance frameworks, and safety metrics. |
| r/singularity | 4,030,667 | HiC Suggest from goal | Enthusiasts and tech analysts discussing consumer adoption trends, public trust, and socio-economic predictions. |
| r/OpenAI | 2,912,010 | HiC Suggest from goal | End users and enterprise adopters reporting everyday model reliability, hallucination issues, and workflow uses. |
| r/smallbusiness | 2,572,290 | HiC Suggest from goal | Small business owners detailing real-world adoption, ROI, and customer service quality changes using AI. |
| r/AskEconomics | 1,461,054 | HiC Suggest from goal | Economists providing expert analysis on AI productivity effects, labor market impacts, and automation research. |
| r/artificial | 1,365,584 | HiC Suggest from goal | Broad AI community discussing societal impacts, public trust, and policy regulation research. |
| r/ClaudeAI | 1,315,570 | HiC Suggest from goal | Researchers and knowledge workers documenting specific workflow integrations and qualitative tool comparisons. |
| r/statistics | 636,634 | HiC Suggest from goal | Statisticians evaluating model accuracy, replication issues, and empirical AI research methodology. |
| r/consulting | 389,587 | HiC Suggest from goal | Management consultants and market analysts sharing client data on enterprise AI spending and ROI. |
| r/PhD | 297,873 | HiC Suggest from goal | Doctoral candidates sharing first-person experiences with AI writing tools, peer review, and academic integrity. |
| r/sociology | 201,754 | HiC Suggest from goal | Social scientists evaluating AI's effects on inequality, social structures, and labor dynamics. |
| r/bioinformatics | 168,507 | HiC Suggest from goal | Life sciences researchers adopting AI for scientific discovery, healthcare outcomes, and drug design. |
| r/rstats | 103,115 | HiC Suggest from goal | Statisticians critiquing machine learning methodologies, empirical study replication, and research tools. |
| r/environmental_science | 91,328 | HiC Suggest from goal | Environmental researchers discussing data center water usage, carbon footprints, and AI energy costs. |
| r/LibraryScience | 84,166 | HiC Suggest from goal | Library professionals discussing information retrieval, AI licensing, and database integration in academic libraries. |
| r/research | 71,607 | HiC Suggest from goal | Cross-disciplinary researchers sharing methodologies, tools, AI workflows, and academic publishing challenges. |
| r/cognitivescience | 64,698 | HiC Suggest from goal | Researchers analyzing AI impact on human cognition, creativity, and mental health interactions. |
| r/postdoc | 31,273 | HiC Suggest from goal | Postdoctoral researchers debating AI adoption in scientific discovery and academic career effects. |
| r/Labour | 27,312 | HiC Suggest from goal | Labor economists and researchers discussing workforce disruption, job displacement, and automation inequality. |
| r/DigitalHumanities | 5,806 | HiC Suggest from goal | Humanities scholars analyzing generative AI applications, cultural heritage, and bias in datasets. |
| r/publichealth | 159,489 | HiC Suggest from goal | Public health researchers assessing population-level outcomes, misinformation spread, and digital health tools. |
| r/Ethics | 54,718 | HiC Suggest from goal | Philosophers and policy scholars debating broad ethical frameworks around artificial general intelligence. |
| r/Humanities | 1,084 | HiC Suggest from goal | Humanities scholars debating AI impacts on human creativity, literature production, and historical analysis. |

Left out after Reddit's check: r/academicnlp (not served (HTTP 302)); r/legalethics (not served (HTTP 404)); r/businessintelligence (restricted); r/scholarlypublishing (3 members); r/researchethics (2 members); r/highereducation (restricted); r/scicomp (3 members); r/sociologyoftechnology (not served (HTTP 302)); r/scholarlycommunity (not served (HTTP 404)); r/aiethics (restricted); r/analysts (restricted); r/mednlp (not served (HTTP 302)); r/compscitheory (not served (HTTP 302)).

## Creative AI

Audience: designers, artists, agencies, brand teams, video and music creators and creative tool vendors.

### Market-research questions

1. How are graphic designers using AI image tools such as Midjourney, Firefly and Stable Diffusion?
2. How do artists feel about AI art, copyright and training data?
3. How are ad agencies using generative AI in campaigns?
4. How are brands using AI for content production at scale?
5. What do illustrators and concept artists say about AI's effect on work?
6. How are video creators using AI video generation and editing tools?
7. How are musicians and producers using AI music tools?
8. How is AI changing UX and product design workflows (Figma AI and others)?
9. How are photographers responding to AI image generation and editing?
10. What copyright lawsuits and rulings affect creative AI?
11. How do clients react to AI-made creative work?
12. How are writers and copywriters using and resisting AI?
13. How are game developers and artists using AI?
14. How is AI used in 3D modeling and animation?
15. How are creative agencies pricing work in an AI era?
16. What do audiences think of AI-generated ads and content?
17. How are stock photo and asset marketplaces handling AI content?
18. How is AI changing branding and logo design?
19. How do creatives protect their work from AI scraping?
20. How are film and TV productions using AI, and what do unions say?
21. How is AI used in fashion design and visualization?
22. What AI tools do social media content creators rely on?
23. How is AI used in architecture and interior design visualization?
24. How do art schools and design programs teach AI?
25. What are the best practices for prompting image and video models for brand work?
26. How are voice actors affected by AI voice cloning?
27. How do freelancers on Fiverr and Upwork compete with AI?
28. How are Adobe, Canva and other tool vendors changing with AI?
29. What ethical guidelines are creative industries adopting for AI?
30. How is AI changing the economics of the creator economy?

### Subreddits crawled (50)

| Subreddit | Members | Named by | Why it is crawled |
|---|---|---|---|
| r/photography | 5,676,659 | HiC Suggest from goal | Professional photographers debating AI image generation, editing tools, and stock market shifts. |
| r/Design | 4,470,005 | HiC Suggest from goal and pack feed | Broad community of professional designers sharing sentiment and experiences regarding AI tools. |
| r/graphic_design | 2,943,232 | HiC Suggest from goal and pack feed | Professional graphic designers discussing AI adoption, agency pricing, and changing client expectations. |
| r/gamedev | 2,087,525 | HiC Suggest from goal | Game developers discussing integration of generative AI in art assets, narrative, and coding. |
| r/midjourney | 1,789,226 | HiC Suggest from goal and pack feed | Active community of creators sharing workflows, prompts, and critiques of AI image generation. |
| r/blender | 1,469,102 | HiC Suggest from goal and pack feed | 3D animators and modelers discussing AI add-ons and generative tools inside Blender. |
| r/artificial | 1,365,584 | HiC Suggest from goal and pack feed | Broader tech community sharing news on copyright lawsuits, rulings, and AI regulations. |
| r/photoshop | 1,212,695 | HiC Suggest from goal and pack feed | Digital artists and editors discussing Adobe Generative Fill and Firefly features. |
| r/StableDiffusion | 1,045,673 | HiC Suggest from goal and pack feed | Technical and artistic discussions on local AI image models, workflows, and control techniques. |
| r/DigitalArt | 864,644 | HiC Suggest from goal | Digital artists debating AI ethics, training data concerns, and anti-AI portfolio protection. |
| r/freelance | 708,671 | HiC Suggest from goal | Freelancers across disciplines discussing competition with AI on platforms like Upwork and Fiverr. |
| r/aiArt | 693,921 | HiC Suggest from goal and pack feed | Prompt engineers and AI artists sharing techniques, workflow best practices, and new model releases. |
| r/musicproduction | 620,659 | HiC Suggest from goal | Audio engineers and producers discussing AI mixing tools, generative music, and copyright. |
| r/logodesign | 489,562 | HiC Suggest from goal and pack feed | Logo designers sharing client experiences when competing against automated AI generators. |
| r/videography | 463,272 | HiC Suggest from goal | Video editors and producers evaluating AI video generation tools and automated editing workflows. |
| r/ArtistLounge | 422,479 | HiC Suggest from goal | Traditional and digital artists discussing the psychological and financial impact of AI tools. |
| r/copywriting | 265,371 | HiC Suggest from goal | Professional copywriters discussing AI writing tool integration, resistance, and content production scale. |
| r/advertising | 262,178 | HiC Suggest from goal | Ad agency professionals sharing how generative AI is used in campaigns and client pitching. |
| r/editors | 200,359 | HiC Suggest from goal | Film and video post-production professionals discussing AI tools, speed improvements, and union concerns. |
| r/VoiceActing | 157,177 | HiC Suggest from goal | Voice actors discussing synthetic voice cloning, contract clauses, and SAG-AFTRA AI protections. |
| r/vfx | 146,315 | HiC Suggest from goal | VFX artists discussing generative AI, neural rendering, 3D modeling, and industry displacement. |
| r/SunoAI | 111,368 | HiC Suggest from goal | Musicians and creators experimenting with generative AI music composition and audio generation. |
| r/DefendingAIArt | 78,102 | HiC Suggest from goal | Pro-AI creative enthusiasts discussing legal developments, ethical arguments, and copyright cases. |
| r/singularity | 4,030,667 | pack feed | followed by the pack as a feed in HiC |
| r/web_design | 983,717 | pack feed | followed by the pack as a feed in HiC |
| r/LocalLLaMA | 885,569 | pack feed | followed by the pack as a feed in HiC |
| r/aivideo | 418,025 | pack feed | followed by the pack as a feed in HiC |
| r/UXDesign | 255,346 | pack feed | followed by the pack as a feed in HiC |
| r/comfyui | 221,817 | pack feed | followed by the pack as a feed in HiC |
| r/FigmaDesign | 160,519 | pack feed | followed by the pack as a feed in HiC |
| r/userexperience | 149,728 | pack feed | followed by the pack as a feed in HiC |
| r/MotionDesign | 132,314 | pack feed | followed by the pack as a feed in HiC |
| r/canva | 103,222 | pack feed | followed by the pack as a feed in HiC |
| r/generative | 101,925 | pack feed | followed by the pack as a feed in HiC |
| r/branding | 98,928 | pack feed | followed by the pack as a feed in HiC |
| r/Adobe | 42,977 | pack feed | followed by the pack as a feed in HiC |
| r/animation | 2,013,707 | HiC Suggest from goal | Animators discussing AI in frame interpolation, inbetweening, and style transfer pipelines. |
| r/marketing | 1,985,640 | HiC Suggest from goal | Brand marketers discussing AI content generation at scale and audience reactions to AI ads. |
| r/Screenwriting | 1,781,876 | HiC Suggest from goal | Writers discussing AI script breakdown tools, WGA AI rules, and generative story ideas. |
| r/InteriorDesign | 1,156,750 | HiC Suggest from goal | Interior designers evaluating AI rendering tools for fast client mockups and spatial planning. |
| r/Songwriting | 1,011,858 | HiC Suggest from goal | Songwriters debating AI lyrics, melody generation, and music copyright developments. |
| r/Illustration | 961,565 | HiC Suggest from goal | Professional illustrators sharing personal stories about client demands for AI speeds. |
| r/SocialMediaMarketing | 322,863 | HiC Suggest from goal | Creators discussing short-form video generation, automated captions, and social media AI tools. |
| r/Upwork | 203,531 | HiC Suggest from goal | Gig economy creatives discussing client rates, AI competition, and changing job briefs. |
| r/conceptart | 169,452 | HiC Suggest from goal | Concept artists discussing how studio pipelines are adopting generative AI for pre-visualization. |
| r/artbusiness | 149,875 | HiC Suggest from goal | Creative entrepreneurs discussing pricing strategies, anti-scraping methods, and protecting work. |
| r/webdesign | 92,532 | HiC Suggest from goal | Web designers discussing AI page generation, Canva/Adobe features, and client handoffs. |
| r/Fiverr | 81,593 | HiC Suggest from goal | Freelancers discussing how AI service offerings affect pricing and order volume. |
| r/adops | 57,128 | HiC Suggest from goal | Digital ad operations specialists discussing creative asset generation at scale using AI. |
| r/filmmaking | 56,901 | HiC Suggest from goal | Indie filmmakers and crew discussing AI tools for pre-vis, scriptwriting, and post-production. |

Left out after Reddit's check: r/commercialartists (not served (HTTP 302)); r/gamegenie (335 members); r/uiuxdesign (restricted); r/architect (not served (HTTP 403)); r/contentwriters (not served (HTTP 404)); r/fashiondesign (not served (HTTP 404)); r/ytcontentcreators (restricted).

## Social Listening

Audience: brand, insights and marketing teams listening to consumers and communities online.

### Market-research questions

1. How do consumers talk about AI products and brands on social media?
2. What are people's biggest complaints about AI chatbots and assistants?
3. How do consumers feel about brands using AI in marketing?
4. How do people react to AI-generated content in their feeds?
5. What do consumers say about privacy and AI data use?
6. How are social listening and insights teams using AI tools?
7. How do Gen Z and young adults talk about AI?
8. How do parents talk about kids and AI?
9. What are the most discussed AI controversies online this month?
10. How do workers talk about AI at their jobs online?
11. How do people describe their daily use of ChatGPT and similar tools?
12. What do consumers say about AI customer service experiences?
13. How do communities react to AI art and creative content?
14. How do people discuss AI and misinformation?
15. What do users say about AI features in phones, apps and search?
16. How do small business owners talk about AI?
17. How do people talk about AI companions and relationships?
18. What do people say about AI in healthcare and their health decisions?
19. How do students talk about AI in school?
20. What do people say about AI and their finances?
21. How do online communities moderate AI-generated posts?
22. What brands are praised or criticized for AI use?
23. How do people talk about jobs lost or changed by AI?
24. How do marketers discuss AI tools for social media management?
25. How do consumers react to AI influencers?
26. What do people say about AI and elections or politics?
27. How do tech enthusiasts compare AI models and products?
28. What do people say about AI in shopping and recommendations?
29. How do people discuss trust and skepticism toward AI?
30. What emerging AI trends are communities excited about?

### Subreddits crawled (50)

| Subreddit | Members | Named by | Why it is crawled |
|---|---|---|---|
| r/technology | 20,651,921 | HiC Suggest from goal | Mainstream consumer reactions to tech brand AI features, privacy concerns, and public controversies. |
| r/ChatGPT | 11,763,199 | HiC Suggest from goal | Everyday consumers and power users sharing daily experiences, prompts, complaints, and product feedback. |
| r/Entrepreneur | 5,314,664 | HiC Suggest from goal | Founders evaluating AI marketing tools, automated customer service, and business efficiency. |
| r/singularity | 4,030,667 | HiC Suggest from goal and pack feed | Enthusiasts tracking rapid AI advancements, future trends, and cultural shifts around automation. |
| r/graphic_design | 2,943,232 | HiC Suggest from goal and pack feed | Professional designers debating AI features in Adobe tools, client demands, and job impact. |
| r/OpenAI | 2,912,010 | HiC Suggest from goal | Tech enthusiasts and users discussing model releases, corporate controversies, safety, and performance. |
| r/jobs | 2,877,197 | HiC Suggest from goal | Workers sharing anxieties, job losses, and workplace mandates around adopting AI software. |
| r/CharacterAI | 2,644,506 | HiC Suggest from goal | Consumers discussing intimate, emotional, and recreational experiences with conversational AI companions. |
| r/smallbusiness | 2,572,290 | HiC Suggest from goal | Small business owners discussing practical AI usage for marketing, support, and daily operations. |
| r/Teachers | 2,449,888 | HiC Suggest from goal | Educators discussing student AI use, academic integrity, and AI detection tool failures. |
| r/socialmedia | 2,125,769 | HiC Suggest from goal | Social media managers discussing AI content generation, platform algorithms, and audience reactions. |
| r/marketing | 1,985,640 | HiC Suggest from goal | Marketing professionals sharing real experiences integrating AI tools into social listening and campaigns. |
| r/midjourney | 1,789,226 | HiC Suggest from goal and pack feed | Generative image creators sharing prompts, model quality feedback, and creative applications. |
| r/LocalLLaMA | 885,569 | HiC Suggest from goal and pack feed | Technical users and privacy advocates running open-source AI models locally on consumer hardware. |
| r/DigitalMarketing | 480,785 | HiC Suggest from goal | Practitioners discussing AI social management, automation tools, SEO, and social listening workflows. |
| r/ArtistLounge | 422,479 | HiC Suggest from goal | Human artists sharing raw sentiments, pushback, and worries about AI-generated art and copyright. |
| r/Professors | 204,002 | HiC Suggest from goal and pack feed | Higher-ed faculty discussing AI policy, student paper cheating, and teaching with AI. |
| r/aiwars | 178,931 | HiC Suggest from goal | Communities intensely debating AI art controversies, copyright, ethics, and human vs. AI creation. |
| r/DefendingAIArt | 78,102 | HiC Suggest from goal | Pro-AI creatives and users advocating for AI art, tools, and generative media adoption. |
| r/Design | 4,470,005 | pack feed | followed by the pack as a feed in HiC |
| r/investing | 3,496,162 | pack feed | followed by the pack as a feed in HiC |
| r/AskAcademia | 2,134,786 | pack feed | followed by the pack as a feed in HiC |
| r/blender | 1,469,102 | pack feed | followed by the pack as a feed in HiC |
| r/artificial | 1,365,584 | pack feed | followed by the pack as a feed in HiC |
| r/photoshop | 1,212,695 | pack feed | followed by the pack as a feed in HiC |
| r/StableDiffusion | 1,045,673 | pack feed | followed by the pack as a feed in HiC |
| r/web_design | 983,717 | pack feed | followed by the pack as a feed in HiC |
| r/GradSchool | 949,532 | pack feed | followed by the pack as a feed in HiC |
| r/Bogleheads | 923,033 | pack feed | followed by the pack as a feed in HiC |
| r/StudentLoans | 719,483 | pack feed | followed by the pack as a feed in HiC |
| r/aiArt | 693,921 | pack feed | followed by the pack as a feed in HiC |
| r/logodesign | 489,562 | pack feed | followed by the pack as a feed in HiC |
| r/aivideo | 418,025 | pack feed | followed by the pack as a feed in HiC |
| r/gradadmissions | 368,450 | pack feed | followed by the pack as a feed in HiC |
| r/PhD | 297,873 | pack feed | followed by the pack as a feed in HiC |
| r/UXDesign | 255,346 | pack feed | followed by the pack as a feed in HiC |
| r/comfyui | 221,817 | pack feed | followed by the pack as a feed in HiC |
| r/berkeley | 186,243 | pack feed | followed by the pack as a feed in HiC |
| r/FigmaDesign | 160,519 | pack feed | followed by the pack as a feed in HiC |
| r/ChubbyFIRE | 156,277 | pack feed | followed by the pack as a feed in HiC |
| r/userexperience | 149,728 | pack feed | followed by the pack as a feed in HiC |
| r/whitecoatinvestor | 137,202 | pack feed | followed by the pack as a feed in HiC |
| r/MotionDesign | 132,314 | pack feed | followed by the pack as a feed in HiC |
| r/UIUC | 132,108 | pack feed | followed by the pack as a feed in HiC |
| r/UTAustin | 118,774 | pack feed | followed by the pack as a feed in HiC |
| r/academia | 112,437 | pack feed | followed by the pack as a feed in HiC |
| r/scholarships | 110,713 | pack feed | followed by the pack as a feed in HiC |
| r/canva | 103,222 | pack feed | followed by the pack as a feed in HiC |
| r/generative | 101,925 | pack feed | followed by the pack as a feed in HiC |
| r/branding | 98,928 | pack feed | followed by the pack as a feed in HiC |

Left out after Reddit's check: r/artificialintelligence (not served (HTTP 404)); r/myreplika (not served (HTTP 302)); r/workplace (not served (HTTP 403)); r/modnews (restricted); r/highereducation (restricted).
