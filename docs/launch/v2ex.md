# V2EX 发布稿（节点建议：programming）

标题

规则要靠"被加载"才生效，机制不靠

正文：

给 AI 写规则的人迟早会撞上一堵墙：你以为规则生效了，其实它经常没被读到。上下文太长被裁掉，任务不走那条路，懒加载到用的时候已经晚了。没被加载的规则，跟没写过一样。

而且规则会越积越多。上下文越来越挤，AI 不是越听话，是越难用。更尴尬的是模型升级之后，你为弱模型写的那些"别这么干、必须那么干"反倒把强模型捆住了。

最烦的是你根本不知道改动有没有落实——规则加载了吗？执行了吗？这次变好是真的还是碰巧？

于是大家会说"让 AI 记住教训"。但记住本身也要靠加载和注意力，还是会漏。

我做的 SkillCanary 换了个思路：把每次翻车变成一道必须通过的题。AI 记不记得住不重要，它必须过了这道题才能合。规则约束过程，机制约束结果。

具体就是：没有 case 或确定性目标不许合；判分靠外部能重算的事实；隐藏测试、答案收起、污点扫描防抄答案；Pass^k 看稳定；判据漂了旧结论作废。

零依赖 Node CLI，MIT，中英文档都有：
https://gitee.com/review-for-qing-lazy/skillcanary

    git clone https://gitee.com/review-for-qing-lazy/skillcanary
    cd skillcanary && node bin/skillcanary.js doctor examples/basic-skill
