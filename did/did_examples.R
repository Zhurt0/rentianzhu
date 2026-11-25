# did_examples.R
# Difference-in-differences on real staggered data, in R.
#
# Castle-doctrine laws (Cheng & Hoekstra 2013), the copy distributed with
# Cunningham's Mixtape: 50 states, 2000-2010, 21 states adopt in 2005-2009.
# Outcome: log homicides per 100,000. Unweighted, no covariates.
#
#   install.packages(c("haven", "fixest", "did"))
#   source("did_examples.R")
#
# Treatment starts in the year a law took effect (effyear); never-treated
# states have g = 0.

library(haven)
library(fixest)
library(did)

d <- as.data.frame(read_dta("https://raw.githubusercontent.com/scunning1975/mixtape/master/castle.dta"))
d$g <- ifelse(is.na(d$effyear), 0, d$effyear)          # adoption year, 0 = never
d$D <- as.integer(d$g > 0 & d$year >= d$g)

# 1. Static TWFE, clustered by state -------------------------------------------
twfe <- feols(l_homicide ~ D | sid + year, data = d, cluster = ~sid)
summary(twfe)

# 2. Callaway & Sant'Anna (2021): never-treated controls, base year g-1 --------
cs <- att_gt(yname = "l_homicide", tname = "year", idname = "sid", gname = "g",
             data = d, control_group = "nevertreated", base_period = "universal",
             bstrap = TRUE, biters = 999, clustervars = "sid")
aggte(cs, type = "simple")
es <- aggte(cs, type = "dynamic", min_e = -5, max_e = 5)
summary(es)
# ggdid(es)

# 3. Sun & Abraham (2021) interaction-weighted event study ---------------------
d$g_sa <- ifelse(d$g == 0, 10000, d$g)                  # never treated: outside the sample
sa <- feols(l_homicide ~ sunab(g_sa, year) | sid + year, data = d, cluster = ~sid)
summary(sa, agg = "ATT")
# iplot(sa)

# Output with R 4.3, fixest and did (November 2026):
#   1. Static TWFE                      0.082 (0.059)
#   2. Callaway & Sant'Anna, simple     0.110 (0.041, bootstrap)
#      event study e = -5..5:  0.032 -0.008 0.057 0.058 0 | 0.097 0.112 0.112 0.137 0.093 0.112
#   3. Sun & Abraham, ATT               0.110 (0.041)
# These match the page and did_examples.py.
