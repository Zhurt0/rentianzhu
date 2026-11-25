*------------------------------------------------------------------------------
* card_krueger.do
* Card & Krueger (1994): New Jersey's 1992 minimum-wage increase, re-estimated
* from the original survey data.
*
* Data: download and unzip https://davidcard.berkeley.edu/data_sets/njmin.zip
*       (public.dat, codebook). Run this file in the folder with public.dat.
*
* Expected result (computed from the same file outside Stata):
*   FTE employment per store, Feb-Mar -> Nov-Dec 1992
*     Pennsylvania 23.33 -> 21.17,  New Jersey 20.44 -> 21.03
*   DiD = +2.75 (store-clustered SE about 1.31; the paper reports 2.76, SE 1.36)
*------------------------------------------------------------------------------

clear all

* Column positions from the codebook; "." in the file is read as missing.
infix sheet 1-3 chain 5 co_owned 7 state 9                          ///
      empft 26-30 emppt 32-36 nmgrs 38-42 wage_st 44-48              ///
      status2 110 empft2 122-126 emppt2 128-132 nmgrs2 134-138        ///
      wage_st2 140-144                                                ///
      using public.dat, clear

label define st 0 "Pennsylvania" 1 "New Jersey"
label values state st

* Full-time-equivalent employment: full-time + managers + half of part-time
gen fte1 = empft  + nmgrs  + 0.5 * emppt
gen fte2 = empft2 + nmgrs2 + 0.5 * emppt2

* The 2x2 table of means
tabstat fte1 fte2 wage_st wage_st2, by(state) statistics(mean n) nototal

* Long format: one row per store and survey wave
keep sheet state chain fte1 fte2
reshape long fte, i(sheet) j(wave)
gen post = wave == 2
gen nj   = state == 1
gen D    = nj * post

* DiD as an interaction regression, clustered by store
regress fte i.nj##i.post, vce(cluster sheet)

* The same with Stata's built-in DiD command
didregress (fte) (D), group(sheet) time(wave)

* Adding chain fixed effects barely moves the estimate
regress fte i.nj##i.post i.chain, vce(cluster sheet)
