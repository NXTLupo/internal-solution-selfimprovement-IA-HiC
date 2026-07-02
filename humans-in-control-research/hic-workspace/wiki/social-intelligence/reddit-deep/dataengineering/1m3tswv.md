---
id: social-intelligence/reddit-deep/dataengineering/1m3tswv.md
url: "https://www.reddit.com/r/dataengineering/comments/1m3tswv/anyone_switched_from_airflow_to_lowcode_data/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "Anyone switched from Airflow to low-code data pipeline tools?"
author: "nilanganray"
date: "2025-07-19T11:21:01.000Z"
score: 87
upvote_ratio: 0.97
num_comments: 105
flair: "Discussion"
extracted_at: "2026-06-11T18:58:17.205Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1m3tswv.md#c0"
    char_span: [0, 1204]
    sentence_count: 10
    key_terms: [tools, dataengineering, comments, low-code, pipeline, airflow, anyone, issues]
    concepts: [dataengineering, tools, comments, low-code, pipeline]
    token_count: 264
    sources: [{"n":"reddit-deep: r/dataengineering","u":"https://www.reddit.com/r/dataengineering/comments/1m3tswv/anyone_switched_from_airflow_to_lowcode_data/"}]
  - id: "social-intelligence/reddit-deep/dataengineering/1m3tswv.md#c1"
    char_span: [1218, 3068]
    sentence_count: 14
    key_terms: [transformation, orchestration, airflow, data, dbt, ingestion, integrate, strictly]
    concepts: [transformation, orchestration, airflow, ingestion, integrate]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1m3tswv.md#c2", "social-intelligence/reddit-deep/dataengineering/1m3tswv.md#c3", "social-intelligence/reddit-deep/dataengineering/1m3tswv.md#c6"]
    section: Comments
    token_count: 424
  - id: "social-intelligence/reddit-deep/dataengineering/1m3tswv.md#c2"
    char_span: [3070, 4739]
    sentence_count: 12
    key_terms: [airflow, dockeroperator, orchestration, logic, business, kubernetespodoperator, people, image]
    concepts: [airflow, dockeroperator, orchestration, logic, business]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1m3tswv.md#c1", "social-intelligence/reddit-deep/dataengineering/1m3tswv.md#c3", "social-intelligence/reddit-deep/dataengineering/1m3tswv.md#c6"]
    section: Comments
    token_count: 360
  - id: "social-intelligence/reddit-deep/dataengineering/1m3tswv.md#c3"
    char_span: [4741, 6884]
    sentence_count: 17
    key_terms: [airflow, use, because, dagster, orchestration, tried, lot, airbyte]
    concepts: [airflow, because, orchestration, dagster, tried]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1m3tswv.md#c1", "social-intelligence/reddit-deep/dataengineering/1m3tswv.md#c2", "social-intelligence/reddit-deep/dataengineering/1m3tswv.md#c4", "social-intelligence/reddit-deep/dataengineering/1m3tswv.md#c6"]
    section: Comments
    token_count: 508
  - id: "social-intelligence/reddit-deep/dataengineering/1m3tswv.md#c4"
    char_span: [6886, 8847]
    sentence_count: 16
    key_terms: [airflow, code, data, going, etl, "it's", like, imcguyver]
    concepts: [airflow, going, imcguyver, dagster, problem]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1m3tswv.md#c3"]
    section: Comments
    token_count: 478
  - id: "social-intelligence/reddit-deep/dataengineering/1m3tswv.md#c5"
    char_span: [8849, 10816]
    sentence_count: 10
    key_terms: [earthgoddessdude, people, azure, work, constantly, repeatable, functions, ingestion]
    concepts: [earthgoddessdude, people, azure, constantly, repeatable]
    section: Comments
    token_count: 445
  - id: "social-intelligence/reddit-deep/dataengineering/1m3tswv.md#c6"
    char_span: [10819, 11958]
    sentence_count: 10
    key_terms: [ingestion, integrate, airflow, orchestration, cleaning, individual-durian952, basic, here]
    concepts: [ingestion, integrate, orchestration, airflow, cleaning]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1m3tswv.md#c1", "social-intelligence/reddit-deep/dataengineering/1m3tswv.md#c2", "social-intelligence/reddit-deep/dataengineering/1m3tswv.md#c3"]
    section: Comments
    token_count: 233
---
# Anyone switched from Airflow to low-code data pipeline tools?

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1m3tswv/anyone_switched_from_airflow_to_lowcode_data/)
Posted by **nilanganray** · **87↑** · **105 comments**

We have been using Airflow for a few years now mostly for custom DAGs, Python scripts, and dbt models. It has worked pretty well overall but as our database and team grow, maintaining this is getting extremely hard. There are so many things we run across:

* Random DAG failures that take forever to debug
* New java folks on our team are finding it even more challenging
* We need to build connectors for goddamn everything

We don’t mind coding but taking care of every piece of the orchestration layer is slowing us down. We have started looking into ETL tools like Talend, Fivetran, Integrate, etc. Leadership is pushing us towards cloud and nocode/AI stuff. Regardless, we want something that works and scales without issues.  
  
Anyone with experience making the switch to low-code data pipeline tools? How do these tools handle complex dependencies, branching logic or retry flows? Any issues with platform switching or lock-ins?

## Comments

- **Conscious-Comfort615** (51↑): One thing that can help you is separating concerns using different layers... for ingestion, transformation, and orchestration. 

Then, audit where failures actually occur (source APIs? schema drift?).

Next, figure out how much control or CI/CD you want baked into the workflow and go from there. You might not need to switch everything.
  - **nilanganray** (7↑): Thanks. We will start by decoupling and keep Airflow for strictly for triggering dbt and ML jobs
    - **umognog** (3↑): Ive got airflow managing over 300 pipelines from source to transformation and the biggest issue i get is about once every 2 months the Daemon dies for a mystery reason.

Decided to simply raise a dead mans switch for HA.
    - **DaveRGP** (1↑): If it's strictly for ml jobs, try dvc. It orchestrates dags, but also has a concept of an 'experiment' a framework for assessing accuracy and a way of ensure reproducibility with snapshotted data assets.
    - **brother_maynerd** (1↑): Not sure if you have heard of tabsdata, but that is what it fundamentally does. It separates out publishers (extractors), transformers, and subscribers (loaders), with built in orchestration for exact dependencies.
  - **Ornery_Visit_936** (3↑): We have done the same thing.

Ingestion layer first where the entire connector maintenance is done by a data pipeline tool. Both Integrate.io and Fivetran are good with this. Lean towards Integrate if you want to do less code and need simpler pricing. 

dbt becomes standard in the transformation layer. All your core business logic and modelling lives here in version controlled SQL completely separate from how the data was ingested.

Now your orchestration can be much simpler. You could keep a lightweight Airflow instance just to trigger dbt build or move to a more modern orchestrator like Dagster.

This is a much cleaner system in every way.
- **Ok_Credit_950** (13↑): We made the switch from Airflow to Skyvia recently, definitely less overhead and faster onboarding for new team members. It is decent for most ETL/ELT workflows and doesn’t need much hand-holding.
- **lightnegative** (15↑): Most people use Airflow wrong and the Airflow docs themselves encourage using it wrong.


You should wrap up your actual business logic into scripts / programs and package them into a Docker container.  This allows them to be tested / iterated on independently of Airflow.


Then, pick your flavour of DockerOperator or KubernetesPodOperator (depending on how you run Airflow) to connect them together, with a sprinkling of PythonOperator to deal with XCom outputs that affect eg which DockerOperator to run next.


Store the image to pull inside an Airflow variable and then reference it in your DAG. Boom - you can upgrade and rollback your business logic by just changing which image to use in Airflow's web UI.


At this point, Airflow is pure orchestration. This is where it shines in my opinion and you can migrate off relatively easily because your transforms aren't tied to it.


If you build all your transformation logic within Airflow, you're in for a world of pain trying to scale your Airflow cluster and deploy / test anything
  - **ludflu** (5↑): this is my experience too. I see many companies naively writing ETL jobs directly with python operators, then growing frustrated when the airflow instance gets overloaded.

When I explain that airflow should be used purely for orchestration, people stare uncomprehendingly into the void like I'm a raving maniac.

As long as you use Airflow just for triggering jobs and tracking dependencies, it works pretty well.
  - **FooFighter_V** (2↑): Agree - learnt the hard way that the best use of Airflow was to keep it as a pure orchestration layer that runs pods on Kube. Best of both worlds.
  - **Tiny_Arugula_5648** (1↑): This is the #1 biggest pain point.. use airflow as a pure orchestration tool  and you'll be happy.. otherwise you're life will become hell..
- **GammaInso** (12↑): We found Dagster and Prefect to be a good middle ground. Still Python but more structured. You would still need to host the infra unless you use their cloud. Might be worth checking out.
  - **nilanganray** (3↑): How is your experience been with deployment and observability on Dagster?
  - **ThatSituation9908** (2↑): Ironically we choose Airflow because the Java are more familiar with it's OOP syntax and Perfect/Dagster was far more pythonic. This was before Airflow added taskflow API
- **jjohncs1v** (5↑): Airbyte gets mentioned a lot on here so I tried it recently and it’s pretty cool. It has a lot built in connectors which is great but one of the services I used (hubspot) has new endpoints which aren’t yet available in Airbyte. So I used the builder to set it up myself. It worked well and it think can probably handle a lot more complexity than I tried with it. I’d imagine you could certainly run into limitations compared to a purely custom coded solution, but it’s nice. And when building your own you can give it the documentation and an AI tool tries to build it for you. Your mileage may vary and it didn’t really do what I wanted so I didn’t use it. 

The other great thing about it is that you can self host. I haven’t tried but the docs make it seems straightforward enough. Then it’s free (other than Infrastructure costs) and you don’t have the normal vendor lock in. But I’m using their hosted version because it’s easy and I’m not running enough data through it to be worth the hassle. The pricing on the hosted version seems reasonable.
- **pag07** (4↑): You are not slowed down because debugging is hard but because you lack architecture skill.

UI driven / low code / no code ETL will create a big ball of mud. It might feel faster in the beginning but as soon as your problems are not super easy it will become disgusting.
  - **tayloramurphy** (1↑): This is a kind way to say skill issue. Also, my experience with getting Claude Code to write DAGs has been quite good. I could imagine a world where PMs prompt CC to build the DAG, data eng reviews/tweaks it, and it's good to go.
- **imcguyver** (3↑): If you manage Airflow yourself, then that may be your problem. Airflow is an OSS tool. You pay for it with your time. Or you can pay for a managed Airflow service (Astronomer, AWS, GCC Composer) with your pocket and immediately solve the infra painpoints.

Prefect and Dagster are great but the OSS versions are going to give you the similar struggles.

Low-code solutions like Talend and Informatica exist. I'd quit before using them again.
  - **McNerdster** (1↑): Another tool that helps orchestrate data pipelines is Stonebranch UAC.  It's going to add security features that some of these other tools don't have. It's also going to give you that drag and drop UX to create workflows that span across multiple data tools (ETL, Data Storage, Data Visualization, etc).
    - **imcguyver** (1↑): Drag n drop to do ETL is an anti pattern. It was like that years ago, the industry since embraced airflow/dagster/etc and that’s how it should be going forward.
- **EarthGoddessDude** (19↑): I don’t know what your setup looks like, and I haven’t worked with Airflow before, but I can tell you with near certainty that you’re looking to trade one problem for a much bigger one. No/low code is just painful for people that know how to use code and version control — a ton of clicks in a GUI, and now all your logic is locked into some proprietary vendor software? Not to mention reproducibility and devex have gone to shit? No thanks, I’d rather stick to code-based, open source tooling that I can version. 

Instead of looking for new tools, maybe think about how you can abstract away the common patterns and reduce boilerplate? Maybe look into Dagster and Prefect as someone else suggested.
  - **nilanganray** (1↑): Fair points but management wants to offload simple repeatable ingestion so other deps are not blocked. I think we have to start somewhere.
    - **EarthGoddessDude** (11↑): Simple and repeatable is exactly the kind of thing you want to automate with code.
    - **Nelson_and_Wilmont** (2↑): It sounds to me that your group needs to create a reusable standardized set of templates. That will fit the need of multiple teams. This is fairly easily done though it may take a couple weeks to work out architecture. Some cloud based options (I’m well versed in azure so here’s what I’d consider), Azure functions with a few different ingress type endpoints users can hit would work fine if they’re a little more technically savvy (which I’m assuming they are since I believe you mentioned they’d have some ingestion work offloaded to them). Or just have blob triggered events where files get loaded to storage accounts and an azure functions picks them up and writes to whatever destination. I’ve implemented similar architectures before and they’ve worked well.
  - **Nekobul** (-16↑): It is good people like you are not taken seriously. 4GL (declarative) data processing is much better compared to implementing code for everything
    - **some_random_tech_guy** (10↑): EarthGoddessDude, please feel free to ignore any and all opinions from Nekobul. He is an idiot that constantly recommends SSIS as the peak of all ETL technology, insults people with his condescending tone, and proffers deeply ignorant opinions regarding tooling choices. You are asking the right questions.
    - **EarthGoddessDude** (4↑): Ha ok, says the guy who constantly gets downvoted into oblivion.
    - **sunder_and_flame** (2↑): >It is good people like you are not taken seriously. 


You genuinely could not project harder if you tried. I'm glad your reputation is finally catching up with the nonsense you peddle here.
- **Individual-Durian952** (3↑): Start by decouping ingestion from orchestration. We had this problem earlier and we realized soon enough that way too much dev time was going into ingestion and basic data cleaning. Integrate.io replaces custom Airflow DAGs for ingestion and Python scripts for basic cleaning. It handles the connectors out of the box. This should solve your API maintenance challenge.

Your Airflow instance should only do one thing that is triggering dbt build job after Integrate completes the loads. You would have a tradeoff here where the ingestion logic would reside in Integrate but I think the gains you would have in speed and stability should make this worth it. You can also try Airbyte if you want open source control but it would have different tradeoffs.
- **riv3rtrip** (3↑): I think switching to low code for general purpose orchestration is a huge mistake. You need to get some help from someone outside your organization because Airflow should not be that challenging.
