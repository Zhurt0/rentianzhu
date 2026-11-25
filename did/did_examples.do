*------------------------------------------------------------------------------
* did_examples.do
* Difference-in-differences: one simulated staggered panel, many estimators.
*
* True effect: grows with time since treatment and is twice as large for the
* earliest cohort, so static TWFE is biased and the robust estimators are not.
*
* Requires Stata 17+ (18+ for xthdidregress). Run section 0 once to install.
* Option names in community packages change between versions: if a line
* errors, check -help <command>-.
*------------------------------------------------------------------------------

clear all
set more off
set seed 20261121

*------------------------------------------------------------------------------
* 0. Install (run once)
*------------------------------------------------------------------------------
/*
foreach pkg in reghdfe ftools bacondecomp twowayfeweights drdid csdid      ///
               eventstudyinteract avar did_imputation event_plot did2s     ///
               jwdid hdfe stackedev lpdid did_multiplegt_dyn honestdid     ///
               sdid boottest {
    cap ssc install `pkg', replace
}
*/

*------------------------------------------------------------------------------
* 1. Simulate a staggered-adoption panel: 500 units, 2000-2014
*------------------------------------------------------------------------------
set obs 500
gen id = _n
gen u  = runiform()
* cohorts: first treated in 2005, 2008, 2011, or never (g = 0)
gen g  = cond(u < .25, 2005, cond(u < .50, 2008, cond(u < .75, 2011, 0)))
gen alpha = rnormal()
drop u

expand 15
bysort id: gen year = 1999 + _n
xtset id year

gen D     = g > 0 & year >= g                 // treatment dummy (absorbing)
gen rel   = year - g if g > 0                 // event time, missing if never
gen never = g == 0
gen Ei    = g if g > 0                        // first-treated year, missing if never

* heterogeneous, dynamic effect
gen tau = D * (1 + 0.5 * (year - g)) * cond(g == 2005, 2, 1)
gen y   = alpha + 0.1 * (year - 2000) + tau + rnormal()

sum tau if D == 1
di as txt "True ATT (average over treated observations) = " as res %6.3f r(mean)

* event-time dummies (t = -1 is the omitted reference period)
forvalues k = 2/11 {
    gen lead`k' = rel == -`k'
}
forvalues k = 0/9 {
    gen lag`k'  = rel == `k'
}

*------------------------------------------------------------------------------
* 2. Baseline: static TWFE and TWFE event study
*------------------------------------------------------------------------------
reghdfe y D, absorb(id year) vce(cluster id)
reghdfe y lead* lag*, absorb(id year) vce(cluster id)

* official command (designed for a single treatment date; shown for syntax)
xtdidregress (y) (D), group(id) time(year)

*------------------------------------------------------------------------------
* 3. Diagnose TWFE
*------------------------------------------------------------------------------
bacondecomp y D, ddetail                       // Goodman-Bacon (2021)
twowayfeweights y id year D, type(feTR)        // de Chaisemartin & D'Haultfoeuille (2020)

*------------------------------------------------------------------------------
* 4. Heterogeneity-robust estimators
*------------------------------------------------------------------------------

* 4a. Callaway & Sant'Anna (2021)
csdid y, ivar(id) time(year) gvar(g) method(dripw)
estat simple
estat event
csdid_plot

* 4b. Stata 18+ official implementation
cap noi xthdidregress aipw (y) (D), group(id)
cap noi estat aggregation, dynamic graph

* 4c. Sun & Abraham (2021)
eventstudyinteract y lead* lag*, cohort(Ei) control_cohort(never) ///
    absorb(i.id i.year) vce(cluster id)

* 4d. Borusyak, Jaravel & Spiess (2024)
did_imputation y id year Ei, horizons(0/5) pretrends(4) autosample
event_plot, default_look graph_opt(xtitle("Years since treatment") ///
    ytitle("ATT") title("Imputation estimator"))

* 4e. Gardner (2021) two-stage DiD
did2s y, first_stage(i.id i.year) second_stage(i.D) treatment(D) cluster(id)

* 4f. Wooldridge (2021) extended TWFE
jwdid y, ivar(id) tvar(year) gvar(g)
estat simple
estat event

* 4g. Stacked event study, Cengiz et al. (2019)
stackedev y lead* lag*, cohort(Ei) time(year) never_treat(never) ///
    unit_fe(id) clust_unit(id)

* 4h. Local-projections DiD, Dube et al. (2023)
lpdid y, unit(id) time(year) treat(D) pre(5) post(5)

* 4i. de Chaisemartin & D'Haultfoeuille (2024)
did_multiplegt_dyn y id year D, effects(5) placebo(4) cluster(id)

*------------------------------------------------------------------------------
* 5. Covariates: parallel trends only after conditioning on x
*------------------------------------------------------------------------------
* x shifts the trend, and treated cohorts have higher x on average, so the
* unconditional comparison is biased while the conditional one is not.
preserve
    bysort id: gen x = cond(g > 0, rnormal(1, 1), rnormal(0, 1)) if _n == 1
    bysort id: replace x = x[1]
    replace y = y + 0.3 * x * (year - 2000)

    * 5a. Callaway & Sant'Anna with doubly robust covariate adjustment
    csdid y x, ivar(id) time(year) gvar(g) method(dripw)
    estat simple

    * 5b. Doubly robust 2x2 (Sant'Anna & Zhao 2020) for the 2005 cohort vs never treated
    keep if inlist(g, 0, 2005) & inlist(year, 2004, 2006)
    gen treat = g == 2005
    drdid y x, ivar(id) time(year) tr(treat) dripw
restore

*------------------------------------------------------------------------------
* 6. Sensitivity and inference
*------------------------------------------------------------------------------

* 6a. Honest DiD, Rambachan & Roth (2023): run after an event-study regression.
*     pre() and post() are the positions of the pre- and post-treatment
*     coefficients in e(b).
reghdfe y lead5 lead4 lead3 lead2 lag0 lag1 lag2 lag3 lag4 lag5 ///
    if inrange(rel, -5, 5) | never, absorb(id year) vce(cluster id)
cap noi honestdid, pre(1/4) post(5/10) mvec(0(0.5)2)

* 6b. Wild cluster bootstrap, Roodman et al. (2019): useful with few clusters
reghdfe y D, absorb(id year) vce(cluster id)
cap noi boottest D, cluster(id) reps(999) nograph

* 6c. Synthetic DiD, Arkhangelsky et al. (2021): needs a balanced panel
cap noi sdid y id year D, vce(bootstrap) reps(50)
