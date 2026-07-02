---
id: social-intelligence/reddit-deep/cybersecurity/1slaaih.md
url: "https://www.reddit.com/r/cybersecurity/comments/1slaaih/axios_10_10_cve_is_not_realistically_exploitable/"
kind: "social-post"
source: "reddit-deep: r/cybersecurity"
subreddit: "cybersecurity"
title: "Axios 10 / 10 CVE is not realistically exploitable  - CVE-2026-40175"
author: "Advocatemack"
date: "2026-04-14T14:26:58.000Z"
score: 95
upvote_ratio: 0.96
num_comments: 23
flair: "News - Breaches & Ransoms"
extracted_at: "2026-06-20T17:52:50.774Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic outlook report on the global insurance industry in 2026, analyzing how AI adoption, emerging technology trends, and macroeconomic pressures collectively reshape coverage structures and consumer perception."
engagement: "deliver-a-strategic-outlook-report-on-the-global-insurance-i"
chunks:
  - id: "social-intelligence/reddit-deep/cybersecurity/1slaaih.md#c0"
    char_span: [0, 1926]
    sentence_count: 10
    key_terms: [com, http, node, header, https, axios-exploit-enables-full-cloud-compromise, cybersecuritynews, critical-axios-flaw-enables-full-cloud]
    concepts: [cybersecuritynews, header, https, cve-2026-40175, cybersecurity]
    token_count: 466
    sources: [{"n":"reddit-deep: r/cybersecurity","u":"https://www.reddit.com/r/cybersecurity/comments/1slaaih/axios_10_10_cve_is_not_realistically_exploitable/"}]
  - id: "social-intelligence/reddit-deep/cybersecurity/1slaaih.md#c1"
    char_span: [1928, 2772]
    sentence_count: 3
    key_terms: [axios-cve-2026-40175-a-critical-bug-thats-not-exploitable, axios, http, adapter, aikido, custom, https, using]
    concepts: [axios-cve-2026-40175-a-critical-bug-thats-not-exploitable, axios, adapter, aikido, custom]
    token_count: 197
  - id: "social-intelligence/reddit-deep/cybersecurity/1slaaih.md#c2"
    char_span: [2786, 4981]
    sentence_count: 14
    key_terms: [cvss, vulnerability, attacker, attack, vulnerabilities, severity, example, target]
    concepts: [vulnerability, attacker, vulnerabilities, attack, severity]
    section: Comments
    token_count: 454
  - id: "social-intelligence/reddit-deep/cybersecurity/1slaaih.md#c3"
    char_span: [4983, 7241]
    sentence_count: 14
    key_terms: [advocatemack, vulnerability, axios, news, node, pollution, prototype, security]
    concepts: [advocatemack, vulnerability, axios, pollution, prototype]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/cybersecurity/1slaaih.md#c4"
    char_span: [6997, 7387]
    sentence_count: 3
    key_terms: [browser, axios, xmlhttprequest, vulnerability, advocatemack, restrictive, arbitrary, injection]
    concepts: [browser, axios]
    section: Comments
    token_count: 94
---
# Axios 10 / 10 CVE is not realistically exploitable  - CVE-2026-40175

Source: [reddit-deep: r/cybersecurity](https://www.reddit.com/r/cybersecurity/comments/1slaaih/axios_10_10_cve_is_not_realistically_exploitable/)
Posted by **Advocatemack** · **95↑** · **23 comments**

There’s a lot of noise around the new Axios CVE-2026-40175 claiming “10/10 critical”, IMDSv2 bypass, and full cloud compromise. The reality is that this is only exploitable in very very obscure non typical environments. The media coverage is wildly overblown and wanted to share.

Example media [CyberNews](https://cybernews.com/security/axios-exploit-enables-full-cloud-compromise/), [CyberSecurityNews](https://cybersecuritynews.com/axios-vulnerability-poc-released/), [CyberKendra](http://cyberkendra.com/2026/04/critical-axios-flaw-enables-full-cloud.html)  

When we weren't able to recreate it, we spoke directly with the [researcher](https://www.linkedin.com/in/raulvegadelvalle/) who reported it who confirmed our suspicious (he's awesome and was also very surpirsed by the 10/10 score)

The issue relies on CRLF header injection, but Node blocks that at the HTTP layer. The exploit should look like this.

    http.request({
      headers: {
        "x-test": "hello\r\nInjected: yes"
      }
    });

But in all standard Node.js environment it throws this error. 

    TypeError [ERR_INVALID_CHAR]: Invalid character in header content

So the request never gets sent, which breaks the exploit chain early.

This happens because Node validates header values against the HTTP spec and explicitly rejects CRLF characters to prevent header injection and request smuggling. We confirmed this behavior back to at least Node v4.  
  
The vulnerability itself is real at the Axios level, and patching it was the right call (I'm not saying it doesn't exist at all). But the “cloud compromise” narrative depends on bypassing Node’s HTTP stack entirely.

The only realistic scenario where this becomes exploitable is if someone is using a custom Axios adapter or manually constructing raw HTTP requests and skipping Node’s built-in validation. (which while possible would be a very edge case senario and would also require multiple mistakes in building that out) 

    axios({
      url: "http://example.com",
      adapter: (config) => {
        // custom logic writing raw HTTP request
      }
    });

For typical Node apps using Axios normally, this isn’t something you’re going to get popped by. 

Just wanting to share if anyone is madly trying to patch and investigate right now. 

You can read our full report here - [https://www.aikido.dev/blog/axios-cve-2026-40175-a-critical-bug-thats-not-exploitable](https://www.aikido.dev/blog/axios-cve-2026-40175-a-critical-bug-thats-not-exploitable)

## Comments

- **r3volved** (59↑): The base CVSS score only measures the potential severity **if exploited**. It’s not a measure of exploitability or targeting.
  - **Rude-Lengthiness-137** (7↑): mmh - when I look into the specifications for CVSS, I'd say there are at least two base values which would not justify a CVSS 10 value.

When I look at CVSS 3.1, I'd argue that the vulnerability - assuming it is exploitable like described in the original advisory - has a high attack complexity. The specification lists these examples:

> For example, a successful attack may depend on an attacker overcoming any of the following conditions:

> - The attacker must conduct target-specific reconnaissance. For example, on target configuration settings, sequence numbers, shared secrets, etc.

>- The attacker must prepare the target environment to improve exploit reliability. For example, repeated exploitation to win a race condition, or overcoming advanced exploit mitigation techniques.

> - The attacker must inject herself into the logical network path between the target and the resource requested by the victim in order to read and/or modify network communications (e.g. man in the middle attack).


The advisory itself said: 
> Imagine a scenario where a known vulnerability exists in a query parser. The attacker sends a payload that sets:

This is the first precondition. Next you need to be able to trigger the web call and you need to get your hands on the full response coming back from the Metadata service.

If I just set the Attack Complexity to High, I'm ending up with a CVSS 9.0

If we look at CVSS 4.0, there is a specific parameter in the Base Value called "Attack Requirements (AT)". If I just set this one to "High" I'm ending up with a 9.5.

I would be really interested in the argumentation, on why this vulnerabilities severity should be comparable to something like log4shell. Remember, that's CVSS sole reason to exist:

>The Common Vulnerability Scoring System (CVSS) captures the principal technical characteristics of software, hardware and firmware vulnerabilities. Its outputs include numerical scores indicating the severity of a vulnerability relative to other vulnerabilities.

I understand and recognize that all models never mirror the reality 100% and they have their limitations, but we should not accept that everyone just wants to "hype" his finding. This is meant to be a useful tool, not a marketing number. Mistakes happen - but that whole story here reads just like if someone wanted to make his little security company famous while the industry is focused on the axios library.
  - **Advocatemack** (21↑): Yes for sure, my grype is not really with the scoring of it (I have some opinions) but mostly it is with the media coverage. Literally no one mentioned that this is basically unexploitable. It send security teams into a panic to fix vulnerabilities that don't exist. Thats my problem. So I wanted to lay out the case for why this shouldn't be in the hyped up news cycle
    - **Altruistic_Fox5036** (3↑): News always over-hypes to drive clicks and get people to view their recently AI generated articles. But this is especially bad as it needs user interaction to implement a non-standard configuration. Arguably the news should be reporting with the temporal score of its if in the wild/there's a patch but that doesn't make people click enough I guess.
  - **d-wreck-w12** (1↑): Exactly! And OP's writeup is a solid case study of why that distinction matters in practice. Node's runtime kills the exploit chain before it ever fires, but every scanner will still light up red because CVSS doesn't care about runtime context, so you end up with SOC analysts burning their Friday triaging a dead end while the misconfigured service account two hops from prod data sits there unbothered. The scoring system measures theoretical blast radius, not whether anyone can actually walk the path to get there.
- **Advocatemack** (13↑): I forgot to mention that Node.js, Deno, and Bun all successfully block or sanitize these requests. So not just Node.js
- **discodamone** (1↑): The most important thing is that it's a gadget and would require prototype pollution as the vulnerability. The prototype pollution would be the vulnerability worth fixing.
- **mouse_8b** (1↑): How does this relate to axios usage in the browser?
  - **Advocatemack** (10↑): Still safe   
In the browser, Axios doesn’t use Node’s `http.request` at all. It uses `XMLHttpRequest` or `fetch` under the hood. Those APIs are even more restrictive so Browsers still don’t allow arbitrary header injection
