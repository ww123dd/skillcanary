# Show HN

Title

Show HN: SkillCanary – rules only work if they get loaded, so make the result pass instead

Body

The first wall with giving an AI rules is not whether a rule is correct, it is whether it gets loaded at all. The rule sits in a skill file or a prompt, you assume it is in effect, and half the time it is not: the context got truncated, the task never took that branch, or lazy loading came too late. A rule that was not loaded is no different from one that was never written.

Then it piles up: more rules, less room, and an AI that gets harder to use rather than better behaved. Then the model upgrade: constraints written for a weaker model become a cage around a stronger one, because rules constrain the process.

And through all of it you cannot tell whether a change actually landed.

"Make it remember so it does not repeat the mistake" does not hold either, since remembering depends on loading and attention too.

So I stopped solving it with rules and made the failure into a case the change has to pass. Rules constrain the process; mechanisms constrain the result. A stronger model should find it easier to pass, not harder.

SkillCanary asks three things: which case is this; was it failing before and where is that evidence; does it pass the same case under the same criteria on a re-run without breaking the others. If the criteria drift, the old conclusion is void. It does not rate models and is not a runner. If a fact cannot be recomputed from outside, it does not count as passing.

Zero-dependency Node CLI, MIT:

    git clone https://gitee.com/review-for-qing-lazy/skillcanary
    cd skillcanary && node bin/skillcanary.js doctor examples/basic-skill
