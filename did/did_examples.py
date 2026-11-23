"""
did_examples.py
Difference-in-differences on real staggered data, in Python.

Castle-doctrine laws (Cheng & Hoekstra 2013), the copy distributed with
Cunningham's Mixtape: 50 states, 2000-2010, 21 states adopt in 2005-2009.
Outcome: log homicides per 100,000. Unweighted, no covariates.

    pip install pyfixest pandas
    python did_examples.py

Treatment starts in the year a law took effect (effyear); never-treated
states have g = 0. Results are printed with the numbers shown on the page
for comparison.
"""
import numpy as np
import pandas as pd
import pyfixest as pf

URL = "https://raw.githubusercontent.com/scunning1975/mixtape/master/castle.dta"

d = pd.read_stata(URL)
d["g"] = d["effyear"].fillna(0).astype(int)              # adoption year, 0 = never
d["year"] = d["year"].astype(int)
d["sid"] = d["sid"].astype(int)
d["D"] = ((d["g"] > 0) & (d["year"] >= d["g"])).astype(int)
y = "l_homicide"

# 1. Static TWFE, clustered by state ------------------------------------------
twfe = pf.feols(f"{y} ~ D | sid + year", data=d, vcov={"CRV1": "sid"})
print("1. Static TWFE                 %.3f (%.3f)" % (twfe.coef()["D"], twfe.se()["D"]))

# 2. Callaway & Sant'Anna by hand: ATT(g,t) vs never-treated, base year g-1 -----
wide = d.pivot(index="sid", columns="year", values=y)
cohort = d.groupby("sid")["g"].first()
never = wide[cohort == 0]
cells = []
for g in sorted(cohort[cohort > 0].unique()):
    tr = wide[cohort == g]
    for t in range(2000, 2011):
        att = (tr[t] - tr[g - 1]).mean() - (never[t] - never[g - 1]).mean()
        cells.append({"g": g, "t": t, "e": t - g, "att": att, "n": len(tr)})
cells = pd.DataFrame(cells)
post = cells[cells.e >= 0]
cs = (post.att * post.n).sum() / post.n.sum()
print("2. Callaway & Sant'Anna (simple) %.3f" % cs)
es = cells.groupby("e").apply(lambda x: (x.att * x.n).sum() / x.n.sum(), include_groups=False)
print("   event study, e = -5..5:", np.round(es.loc[-5:5].values, 3))

# 3. Gardner (2021) two-stage DiD ---------------------------------------------
fit2s = pf.did2s(d, yname=y, first_stage="~ 0 | sid + year", second_stage="~ D",
                 treatment="D", cluster="sid")
print("3. Two-stage DiD (did2s)       %.3f (%.3f)" % (fit2s.coef()["D"], fit2s.se()["D"]))

# 4. Local-projections DiD (Dube et al. 2023), pooled post-treatment effect ---
lp = pf.lpdid(d, yname=y, idname="sid", tname="year", gname="g", vcov={"CRV1": "sid"},
              pre_window=5, post_window=5, att=True)
print("4. LP-DiD (pooled)")
print(lp.tidy())

# 5. Saturated event study (Sun & Abraham-type interactions) ------------------
sat = pf.event_study(d, yname=y, idname="sid", tname="year", gname="g",
                     estimator="saturated", cluster="sid")
print("5. Saturated event study: see sat.summary() / sat.iplot()")

# Output with pyfixest 0.70 (November 2026):
#   1. Static TWFE                  0.082 (0.059)
#   2. Callaway & Sant'Anna          0.110; event study e=-5..5:
#      0.032 -0.008 0.057 0.058 0 | 0.097 0.112 0.112 0.137 0.093 0.112
#   3. Two-stage DiD                 0.080 (0.061)
#   4. LP-DiD, pooled post effect    0.093 (0.033)
# These match the page (TWFE 0.082, CS 0.110; the page's standard errors come
# from a state bootstrap, so they differ slightly from the clustered ones here).
