# Difference-in-Differences

**The Story of the Economists' Workhorse**

A compact collection on difference-in-differences (DiD): what it is, the main versions of it, the Stata command for each, and the papers behind them.

- `index.html` — the full collection as a single self-contained web page (works on GitHub Pages)
- `did_examples.do` — a simulated staggered-adoption panel with one call to each main estimator

## What it is

Compare the change over time in a treated group with the change in an untreated group:

```
DiD = (Y_treated,post − Y_treated,pre) − (Y_control,post − Y_control,pre)
```

It identifies the average treatment effect on the treated (ATT) under **parallel trends**, **no anticipation** and **no spillovers**.

## Versions and Stata commands

| Version | Use it when | Stata | Paper |
|---|---|---|---|
| Canonical 2×2 / TWFE | Single treatment date | `didregress`, `xtdidregress`, `reghdfe` | Card & Krueger (1994) |
| Triple differences | A within-group unaffected subgroup exists | `didregress ..., group(g1 g2)` | Gruber (1994); Olden & Møen (2022) |
| Doubly robust DiD | Parallel trends holds conditional on covariates | `drdid` | Abadie (2005); Sant'Anna & Zhao (2020) |
| Bacon decomposition | Diagnosing staggered TWFE | `bacondecomp` | Goodman-Bacon (2021) |
| Negative weights | Diagnosing staggered TWFE | `twowayfeweights` | de Chaisemartin & D'Haultfœuille (2020) |
| Group-time ATT | Staggered adoption | `csdid`, `xthdidregress` | Callaway & Sant'Anna (2021) |
| Interaction-weighted event study | Staggered adoption | `eventstudyinteract` | Sun & Abraham (2021) |
| Imputation | Staggered adoption | `did_imputation` | Borusyak, Jaravel & Spiess (2024) |
| Two-stage DiD | Staggered adoption | `did2s` | Gardner (2021) |
| Extended TWFE | Staggered, nonlinear outcomes | `jwdid` | Wooldridge (2021, 2023) |
| Stacked DiD | Staggered, clean-control windows | `stackedev` | Cengiz et al. (2019); Wing et al. (2024) |
| Local-projections DiD | Staggered, large data | `lpdid` | Dube, Girardi, Jordà & Taylor (2023) |
| Efficient estimator | Random treatment timing | `staggered` | Roth & Sant'Anna (2023) |
| Intertemporal effects | Non-binary or reversible treatment | `did_multiplegt_dyn` | de Chaisemartin & D'Haultfœuille (2024) |
| Continuous treatment | Dose varies, no untreated group | `did_had` | Callaway, Goodman-Bacon & Sant'Anna (2024) |
| Fuzzy DiD | Treatment rate changes, no sharp groups | `fuzzydid` | de Chaisemartin & D'Haultfœuille (2018) |
| Changes-in-changes | Distributional effects | `cic` | Athey & Imbens (2006) |
| Honest DiD | Sensitivity to parallel-trends violations | `honestdid` | Rambachan & Roth (2023) |
| Pre-trend power | Interpreting flat pre-trends | `pretrends` | Roth (2022) |
| Synthetic DiD / control | Few treated units, poor pre-trend fit | `sdid`, `synth` | Arkhangelsky et al. (2021); Abadie et al. (2010) |
| Interactive fixed effects | Latent factors | `fect` | Xu (2017); Liu, Wang & Xu (2024) |
| Wild cluster bootstrap | Few clusters | `boottest` | Cameron, Gelbach & Miller (2008); Roodman et al. (2019) |

The full reference list with journal details is in `index.html`.

## Start here

1. Roth, Sant'Anna, Bilinski & Poe (2023), "What's trending in difference-in-differences?", *Journal of Econometrics* 235(2).
2. de Chaisemartin & D'Haultfœuille (2023), "Two-way fixed effects and differences-in-differences with heterogeneous treatment effects: A survey", *Econometrics Journal* 26(3).
3. Baker, Callaway, Cunningham, Goodman-Bacon & Sant'Anna (2025), "Difference-in-differences designs: A practitioner's guide".
