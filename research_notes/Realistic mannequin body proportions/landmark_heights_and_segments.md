# Adult body vertical proportions and segment lengths (landmark heights, segments, girth levels, shoulder geometry, sex differences, models/dress forms)

**Read this first — how the numbers below were obtained**

- The session's network policy blocked almost every host (DTIC, OpenLab PSU, CDC, Wikipedia, PMC, arXiv, iteh.ai, Human Kinetics all failed to resolve or returned proxy 403). Only GitHub and web *search* worked. So **no report PDF was opened directly**.
- The core tables are therefore **my own computations from the public raw survey files** (per-subject CSVs), not transcriptions of the printed summary tables:
  - **ANSUR II** (2012 US Army Anthropometric Survey; Gordon et al. 2014, NATICK/TR-15/007): `ANSUR_II_MALE_Public.csv` n = 4,082 men, `ANSUR_II_FEMALE_Public.csv` n = 1,986 women, 93 directly measured dimensions. Mean age 30.2 (M) / 28.9 (F); mean BMI 27.7 (M) / 25.5 (F).
  - **ANSUR I** (1987-88 US Army survey; Gordon et al. 1989, NATICK/TR-89/044): `ansurMen.csv` n = 1,774, `ansurWomen.csv` n = 2,208, 131 dimensions (it has landmarks ANSUR II dropped: natural-waist height, gluteal-furrow height, calf height, lateral neck height, scye depth). Mean BMI 25.4 (M) / 23.3 (F).
  - **NHANES 2015-2018** adults 20+ (US civilians), height/weight/waist only, weighted with `WTMEC2YR`.
  - Files were read from a GitHub mirror of the Penn State OpenLab distribution: <https://github.com/marcin-chwedczuk/ansur_pgadmin_explorer/tree/main/data/raw> (commit 5e4d24f). Official homes: <https://www.openlab.psu.edu/ansur2/>, <https://www.openlab.psu.edu/ansur/>, <https://www.openlab.psu.edu/nhanes/>.
  - Sanity check: computed ANSUR II stature mean/SD = 175.62/6.86 cm (M), 162.85/6.42 cm (F), consistent with the sample sizes and description given for the public working databases at <https://ph.health.mil/topics/workplacehealth/ergo/Pages/Anthropometric-Database.aspx>.
- Statistics are **unweighted** sample statistics. "Fraction" = mean of each subject's own (measurement / own stature), with its SD — not ratio of means. All lengths in cm (source files are mm).
- Rows marked **(D)** are *derived* by me from two or more measured dimensions (formula given); they are not survey dimensions.
- Measurement definitions quoted in parentheses are from my knowledge of the ANSUR measurer's handbook wording; they could not be re-checked against the report in this session.
- Numbers for ASTM, fashion-model studies, Bodyspace and shoulder-slope literature come from **search-result summaries** of the cited pages, not from reading the page. They are flagged "(via search summary)".
- Hosts that would need allow-listing to verify/extend: `apps.dtic.mil`, `www.openlab.psu.edu`, `stacks.cdc.gov`, `cdn.standards.iteh.ai`, `pmc.ncbi.nlm.nih.gov`, `arxiv.org`, `en.wikipedia.org`, `us.humankinetics.com`.

---

## 1. Heights above the floor of each landmark, as cm and as a fraction of stature (men and women)

### Takeaway
In two large US Army surveys the vertical landmark fractions are almost identical for men and women (differences mostly under 0.01 of stature): C7 about 0.86, acromion 0.82, axilla 0.76, natural waist 0.64-0.65, navel 0.60, buttock protrusion 0.51, crotch 0.48, mid-patella 0.28, lateral malleolus 0.04. The landmarks that differ by sex are the bust/nipple level (0.735 M vs 0.719 F) and the lowest rib/natural waist (about 0.01 higher in women). Navel and narrowest waist are 7 cm apart, so they must be separate landmarks.

### Cited Findings

**Table 1A. ANSUR II (2012), standing landmark heights.** Format: mean (SD) [5th / 50th / 95th] cm; fraction of stature mean (SD). Computed from the public raw files — [ANSUR II data mirror](https://github.com/marcin-chwedczuk/ansur_pgadmin_explorer/tree/main/data/raw), [OpenLab ANSUR II](https://www.openlab.psu.edu/ansur2/), survey report [Gordon et al. 2014](https://apps.dtic.mil/sti/pdfs/ADA611869.pdf) (report not opened).

| Landmark (ANSUR II variable) | Men cm | Men frac | Women cm | Women frac |
|---|---|---|---|---|
| Vertex = `stature` | 175.62 (6.86) [164.8 / 175.5 / 187.0] | 1.000 | 162.85 (6.42) [152.5 / 162.6 / 174.0] | 1.000 |
| Eye **(D)** = stature − (sittingheight − eyeheightsitting) | 164.24 (6.65) [153.6 / 164.0 / 175.3] | 0.935 (0.005) | 151.95 (6.18) [142.1 / 151.7 / 162.6] | 0.933 (0.005) |
| Cervicale / C7 nape `cervicaleheight` | 151.73 (6.33) [141.6 / 151.7 / 162.3] | 0.864 (0.007) | 139.57 (5.95) [130.0 / 139.3 / 149.8] | 0.857 (0.007) |
| Acromion `acromialheight` | 144.07 (6.33) [133.9 / 143.9 / 154.6] | 0.820 (0.010) | 133.51 (5.81) [124.2 / 133.2 / 143.4] | 0.820 (0.009) |
| Suprasternale `suprasternaleheight` | 143.86 (6.13) [134.1 / 143.7 / 154.0] | 0.819 (0.007) | 132.97 (5.72) [123.6 / 132.7 / 142.8] | 0.816 (0.007) |
| Axilla / armpit `axillaheight` | 132.91 (5.95) [123.4 / 132.8 / 142.7] | 0.757 (0.009) | 123.90 (5.58) [114.9 / 123.6 / 133.3] | 0.761 (0.009) |
| Chest / bust point `chestheight` (nipple on men, bustpoint on women) | 129.11 (5.70) [120.0 / 128.9 / 138.7] | 0.735 (0.011) | 117.16 (5.55) [108.0 / 116.9 / 126.6] | 0.719 (0.014) |
| Lowest rib `tenthribheight` | 112.07 (5.36) [103.4 / 111.9 / 121.1] | 0.638 (0.012) | 105.63 (5.00) [97.6 / 105.4 / 114.0] | 0.648 (0.011) |
| Iliac crest `iliocristaleheight` | 106.16 (5.20) [97.7 / 106.1 / 114.8] | 0.604 (0.013) | 99.57 (4.97) [91.8 / 99.3 / 108.0] | 0.611 (0.013) |
| Waist at navel `waistheightomphalion` | 105.65 (5.22) [97.2 / 105.5 / 114.5] | 0.601 (0.013) | 98.02 (5.00) [90.0 / 97.8 / 106.4] | 0.602 (0.013) |
| Trochanterion `trochanterionheight` | 90.09 (4.92) [82.4 / 89.9 / 98.5] | 0.513 (0.015) | 84.54 (4.47) [77.4 / 84.4 / 91.9] | 0.519 (0.014) |
| Buttock, max protrusion `buttockheight` | 88.79 (4.99) [80.9 / 88.5 / 97.2] | 0.505 (0.016) | 83.37 (4.57) [76.1 / 83.1 / 91.1] | 0.512 (0.016) |
| Wrist (stylion), arm hanging `wristheight` | 84.75 (4.17) [78.0 / 84.7 / 91.7] | 0.482 (0.012) | 79.42 (3.82) [73.2 / 79.4 / 86.0] | 0.488 (0.012) |
| Crotch `crotchheight` | 84.59 (4.65) [77.1 / 84.5 / 92.5] | 0.481 (0.014) | 78.23 (4.46) [71.2 / 78.0 / 85.7] | 0.480 (0.015) |
| Mid-thigh **(D)** = (crotch + mid-patella)/2 | 66.72 | 0.380 (0.011) | 61.57 | 0.378 (0.011) |
| Knee, lateral femoral epicondyle `lateralfemoralepicondyleheight` | 49.17 (2.66) [44.9 / 49.1 / 53.7] | 0.280 (0.008) | 46.59 (2.71) [42.2 / 46.5 / 51.1] | 0.286 (0.010) |
| Knee, mid-patella `kneeheightmidpatella` | 48.84 (2.81) [44.3 / 48.7 / 53.6] | 0.278 (0.009) | 44.91 (2.60) [40.8 / 44.8 / 49.3] | 0.276 (0.009) |
| Knee, tibiale `tibialheight` | 46.82 (2.66) [42.6 / 46.8 / 51.3] | 0.267 (0.008) | 43.78 (2.50) [39.9 / 43.7 / 47.9] | 0.269 (0.008) |
| Ankle, lateral malleolus `lateralmalleolusheight` | 7.29 (0.57) [6.4 / 7.3 / 8.3] | 0.042 (0.003) | 6.28 (0.51) [5.4 / 6.3 / 7.1] | 0.038 (0.003) |

**Table 1B. ANSUR I (1988), landmarks not measured in ANSUR II, plus repeats for comparison.** Same format. Computed from the public raw files — [ANSUR I data mirror](https://github.com/marcin-chwedczuk/ansur_pgadmin_explorer/tree/main/data/raw), [OpenLab ANSUR I](https://www.openlab.psu.edu/ansur/), survey report [Gordon et al. 1989](https://apps.dtic.mil/sti/pdfs/ADA209600.pdf) (report not opened).

| Landmark (ANSUR I variable) | Men cm | Men frac | Women cm | Women frac |
|---|---|---|---|---|
| `STATURE` | 175.58 (6.68) [164.9 / 175.6 / 186.8] | 1.000 | 162.94 (6.36) [152.9 / 162.8 / 173.7] | 1.000 |
| Eye **(D)** | 163.39 (6.57) [152.9 / 163.3 / 174.3] | 0.930 (0.005) | 151.61 (6.25) [141.5 / 151.5 / 162.1] | 0.930 (0.005) |
| Cervicale `CERVIC_HT` | 151.94 (6.28) [142.0 / 151.8 / 162.2] | 0.865 (0.007) | 140.80 (5.92) [131.5 / 140.6 / 150.8] | 0.864 (0.007) |
| **Side neck point** `NECK_HT-LATERAL` (trapezius landmark at neck base) | 150.95 (6.16) [141.2 / 150.8 / 161.0] | 0.860 (0.006) | 139.65 (5.84) [130.4 / 139.6 / 149.4] | 0.857 (0.006) |
| Acromion `ACROMION_HT` | 144.25 (6.20) [134.2 / 144.2 / 154.5] | 0.821 (0.010) | 133.36 (5.79) [124.4 / 133.2 / 143.0] | 0.818 (0.009) |
| Suprasternale `SUPRASTERNALE_HT` | 143.84 (5.93) [134.4 / 143.6 / 153.5] | 0.819 (0.007) | 133.03 (5.60) [124.1 / 132.9 / 142.5] | 0.816 (0.007) |
| Axilla `AXILLA_HT` | 132.09 (5.80) [122.6 / 132.0 / 141.5] | 0.752 (0.009) | 123.36 (5.43) [115.0 / 123.3 / 132.4] | 0.757 (0.009) |
| Chest / bust point `CHEST_HT` | 127.59 (5.61) [118.6 / 127.3 / 136.8] | 0.727 (0.010) | 117.44 (5.50) [108.8 / 117.2 / 127.1] | 0.721 (0.013) |
| **Natural (narrowest) waist** `WAIST_HT_NATURAL` | 112.71 (5.21) [104.5 / 112.5 / 121.1] | 0.642 (0.012) | 105.65 (5.17) [97.4 / 105.5 / 114.2] | 0.648 (0.014) |
| Lowest rib `TENTH_RIB` | 112.12 (5.13) [104.0 / 111.9 / 120.5] | 0.638 (0.011) | 104.44 (4.87) [96.8 / 104.3 / 112.7] | 0.641 (0.011) |
| Iliac crest `ILIOCRISTALE_HT` | 107.34 (5.14) [99.3 / 107.2 / 115.8] | 0.611 (0.012) | 98.88 (4.82) [91.2 / 98.7 / 106.9] | 0.607 (0.012) |
| Waist at navel `WAIST_HT-OMPHALION` | 105.88 (5.09) [97.7 / 105.7 / 114.3] | 0.603 (0.012) | 98.21 (4.88) [90.5 / 98.1 / 106.4] | 0.603 (0.013) |
| Trochanterion `TROCHANTERION_HT` | 92.83 (4.77) [85.4 / 92.6 / 100.8] | 0.529 (0.014) | 86.16 (4.52) [79.1 / 86.0 / 93.7] | 0.529 (0.015) |
| Buttock, max protrusion `BUTT_HT` | 88.74 (4.71) [81.6 / 88.5 / 96.6] | 0.505 (0.015) | 83.83 (4.52) [76.8 / 83.7 / 91.5] | 0.514 (0.016) |
| Crotch `CROTCH_HT` | 83.72 (4.63) [76.6 / 83.5 / 91.6] | 0.477 (0.014) | 77.14 (4.41) [70.2 / 77.1 / 84.5] | 0.473 (0.015) |
| **Gluteal furrow** `GLUTEAL_FURROW_HT` | 81.44 (4.56) [74.4 / 81.2 / 89.0] | 0.464 (0.014) | 74.43 (4.30) [67.6 / 74.4 / 81.7] | 0.457 (0.015) |
| Mid-thigh **(D)** = (crotch + mid-patella)/2 | 67.10 (3.62) | 0.382 (0.011) | 61.50 (3.45) | 0.377 (0.012) |
| Knee, mid-patella `PATELLA-MID_HT` | 50.48 (2.76) [46.2 / 50.3 / 55.1] | 0.287 (0.009) | 45.87 (2.61) [41.7 / 45.8 / 50.2] | 0.281 (0.009) |
| Knee, lateral femoral epicondyle | 50.15 (2.63) [46.1 / 50.0 / 54.6] | 0.286 (0.008) | 46.11 (2.47) [42.2 / 46.0 / 50.3] | 0.283 (0.008) |
| **Calf, level of max girth** `CALF_HT` | 35.34 (2.37) [31.6 / 35.2 / 39.3] | 0.201 (0.009) | 31.61 (2.40) [27.8 / 31.5 / 35.7] | 0.194 (0.011) |
| Ankle, lateral malleolus `LATERAL-MALLEOUS_HT` | 6.71 (0.55) [5.9 / 6.7 / 7.6] | 0.038 (0.003) | 6.06 (0.53) [5.2 / 6.0 / 7.0] | 0.037 (0.003) |
| Wrist `WRIST_HT` | 84.65 (4.15) [77.7 / 84.7 / 91.5] | 0.482 (0.012) | 79.03 (3.86) [72.8 / 79.0 / 85.4] | 0.485 (0.013) |

**Vertical gaps between adjacent torso/hip landmarks** (mean (SD) cm; same sources as the table named in each row):

| Gap | Men | Women | Survey |
|---|---|---|---|
| Natural waist above navel | 6.83 (1.78) | 7.44 (2.10) | [ANSUR I](https://www.openlab.psu.edu/ansur/) |
| Lowest rib relative to natural waist (negative = rib is below) | −0.59 (1.33) | −1.21 (1.84) | ANSUR I |
| Natural waist above iliac crest | 5.37 (1.45) | 6.77 (1.87) | ANSUR I |
| Lowest rib above navel | 6.42 (2.10) | 7.61 (1.82) | [ANSUR II](https://www.openlab.psu.edu/ansur2/) |
| Iliac crest above navel | 0.51 (2.09) | 1.56 (1.87) | ANSUR II |
| Bust/nipple level above natural waist | 14.88 (1.97) | 11.79 (2.54) | ANSUR I |
| Suprasternale above bust/nipple level | 16.25 (1.44) | 15.59 (1.91) | ANSUR I |
| Axilla above bust/nipple level | 4.50 (1.47) | 5.93 (1.86) | ANSUR I |
| Acromion above axilla | 12.16 (1.03) | 9.99 (0.91) | ANSUR I |
| Acromion above axilla | 11.17 (1.21) | 9.61 (1.12) | ANSUR II |
| C7 above acromion | 7.69 (1.40) | 7.44 (1.36) | ANSUR I |
| C7 above acromion | 7.66 (1.36) | 6.06 (1.33) | ANSUR II |
| C7 above suprasternale | 7.87 (1.17) | 6.60 (1.19) | ANSUR II |
| Natural waist above buttock-protrusion level | 23.96 (1.87) | 21.82 (2.43) | ANSUR I |
| Navel above buttock-protrusion level | 16.86 (2.64) | 14.64 (2.49) | ANSUR II |
| Buttock-protrusion level above crotch | 5.03 (1.65) | 6.70 (1.46) | ANSUR I |
| Buttock-protrusion level above crotch | 4.19 (2.11) | 5.14 (1.79) | ANSUR II |
| Trochanterion above crotch | 5.50 (1.93) | 6.30 (1.62) | ANSUR II |
| Crotch above gluteal furrow | 2.28 (1.46) | 2.70 (1.29) | ANSUR I |
| Buttock-protrusion level above gluteal furrow | 7.30 (1.40) | 9.40 (1.37) | ANSUR I |
| Mid-patella above calf max-girth level | 15.15 (1.33) | 14.25 (1.45) | ANSUR I |

**Tailoring-measurement analogues in the same data** (mean (SD) [5th / 95th] cm):

| Tailoring input | Survey dimension | Men | Women |
|---|---|---|---|
| Back length nape-to-waist (surface, to natural waist) | ANSUR I `WAIST_NAT_LNTH` | 41.20 (2.32) [37.3 / 45.0], 0.235 of stature | 36.73 (2.51) [32.7 / 41.0], 0.225 |
| Back length to navel-level waist (surface) | ANSUR II `waistbacklength` | 47.76 (2.77) [43.3 / 52.4], 0.272 | 42.54 (2.64) [38.4 / 47.0], 0.261 |
| C7 to natural waist, **vertical** **(D)** | ANSUR I | 39.23 (2.18) [35.6 / 42.8], 0.223 | 35.14 (2.36) [31.5 / 39.2], 0.216 |
| C7 to navel, vertical **(D)** | ANSUR II | 46.08 (2.61) [41.9 / 50.4], 0.263 | 41.55 (2.34) [37.9 / 45.5], 0.255 |
| Body rise, natural waist to crotch, vertical **(D)** | ANSUR I | 28.99 (2.15) [25.6 / 32.5], 0.165 | 28.52 (2.37) [24.6 / 32.6], 0.175 |
| Rise from navel to crotch, vertical **(D)** | ANSUR II | 21.06 (2.13) [17.6 / 24.6], 0.120 | 19.78 (2.10) [16.4 / 23.2], 0.121 |
| Inseam | ANSUR II `crotchheight` | 84.59 (4.65), 0.481 | 78.23 (4.46), 0.480 |
| Knee height | ANSUR II `kneeheightmidpatella` | 48.84 (2.81), 0.278 | 44.91 (2.60), 0.276 |
| Scye depth (C7 down to armhole level, back) | ANSUR I `SCYE_DEPTH` | 21.27 (1.55), 0.121 | 18.57 (1.44), 0.114 |
| Front waist length, natural | ANSUR I `WST_NAT_FRONT` | 34.57 (2.18) | 31.17 (2.35) |
| Side neck to bust point (surface) | ANSUR I `NECK_TO_BUSTPOINT_LNTH` | 27.24 (1.82) | 26.80 (2.23) |
| Bust point to bust point | ANSUR I `BUSTPOINT_TO_BUSTPOINT_BRTH` | 21.59 (1.89) | 18.48 (1.62) |
| Waist (navel) to hip level, along the side | ANSUR I `WAIST_HIP_LNTH` | 17.68 (2.04) | 14.84 (2.13) |

**Linear fits, landmark height = a + b × stature** (cm; r; residual SD cm) — these outperform a pure fraction for short or tall bodies because every intercept is negative (taller people are proportionally longer-legged). Computed from [ANSUR II](https://www.openlab.psu.edu/ansur2/) unless marked I ([ANSUR I](https://www.openlab.psu.edu/ansur/)).

| Landmark | Men | Women |
|---|---|---|
| Cervicale | −7.81 + 0.9084 H; r 0.984; resid 1.12 | −9.04 + 0.9126 H; r 0.984; resid 1.05 |
| Side neck point (I) | −8.59 + 0.9086 H; r 0.985; resid 1.05 | −8.18 + 0.9073 H; r 0.988; resid 0.91 |
| Acromion | −12.69 + 0.8926 H; r 0.967; resid 1.62 | −9.69 + 0.8793 H; r 0.972; resid 1.37 |
| Axilla | −14.84 + 0.8413 H; r 0.969; resid 1.47 | −13.05 + 0.8410 H; r 0.968; resid 1.41 |
| Chest / bust point | −9.20 + 0.7876 H; r 0.948; resid 1.81 | −11.70 + 0.7913 H; r 0.915; resid 2.23 |
| Lowest rib | −15.02 + 0.7236 H; r 0.925; resid 2.03 | −13.48 + 0.7314 H; r 0.939; resid 1.72 |
| Natural waist (I) | −13.46 + 0.7185 H; r 0.922; resid 2.02 | −13.61 + 0.7320 H; r 0.900; resid 2.25 |
| Navel waist | −15.74 + 0.6912 H; r 0.908; resid 2.18 | −17.31 + 0.7082 H; r 0.909; resid 2.09 |
| Iliac crest | −15.04 + 0.6901 H; r 0.909; resid 2.16 | −15.80 + 0.7085 H; r 0.915; resid 2.00 |
| Trochanterion | −16.99 + 0.6098 H; r 0.850; resid 2.59 | −12.69 + 0.5970 H; r 0.858; resid 2.30 |
| Buttock protrusion | −16.85 + 0.6015 H; r 0.826; resid 2.81 | −14.09 + 0.5985 H; r 0.840; resid 2.48 |
| Gluteal furrow (I) | −20.36 + 0.5798 H; r 0.849; resid 2.41 | −16.82 + 0.5600 H; r 0.828; resid 2.41 |
| Crotch | −17.63 + 0.5821 H; r 0.858; resid 2.39 | −17.91 + 0.5904 H; r 0.849; resid 2.36 |
| Mid-patella | −11.21 + 0.3419 H; r 0.833; resid 1.55 | −10.69 + 0.3414 H; r 0.843; resid 1.40 |
| Tibiale | −11.91 + 0.3344 H; r 0.861; resid 1.35 | −10.36 + 0.3325 H; r 0.852; resid 1.31 |
| Calf max girth (I) | −10.84 + 0.2630 H; r 0.742; resid 1.59 | −9.80 + 0.2542 H; r 0.675; resid 1.77 |
| Lateral malleolus | 0.50 + 0.0387 H; r 0.468; resid 0.50 | 0.60 + 0.0348 H; r 0.438; resid 0.46 |
| Wrist | −6.64 + 0.5204 H; r 0.856; resid 2.15 | −3.35 + 0.5083 H; r 0.854; resid 1.99 |

**Other populations (via search summary, not opened):**
- British adults 19-65, Pheasant & Haslegrave *Bodyspace*, 50th percentile: stature 1740 mm men / 1610 mm women; eye height 1630 / 1505 mm; shoulder height 1425 / 1310 mm; men's elbow height 1090 mm (5th-95th 1005-1180). That is eye 0.937 / 0.935, shoulder 0.819 / 0.814, elbow 0.626 (men) of stature — [amesweb reproduction of Bodyspace table](https://amesweb.info/ergonomics/anthropometry-definition.aspx); a second reproduction gives slightly different values (stature 1745 / 1620, elbow 1100 / 1020, hip height 935 / 820, knuckle height 765 / 720 mm) — [Scribd anthropometrics notes](https://www.scribd.com/document/252821005/Anthropometrics-Notes). The search summary warned that the first table's layout was garbled, so treat both as approximate.
- US civilians, NHANES 2015-2018, age 20+, weighted: mean standing height 175.26 cm (SD 7.51) men, 161.21 cm (SD 6.97) women; waist circumference 102.86 cm (SD 16.4) men, 98.37 cm (SD 17.4) women; BMI 29.4 men, 29.8 women. Computed from the OpenLab extract — [NHANES data mirror](https://github.com/marcin-chwedczuk/ansur_pgadmin_explorer/tree/main/data/raw); official publication [NCHS Vital Health Stat 3(46)](https://stacks.cdc.gov/view/cdc/100478) (not opened).

### Inferences
- **Suggested default fractions for the mannequin** (pooled from Tables 1A/1B; M / F): eye 0.933 / 0.932; C7 0.864 / 0.860; side neck point 0.860 / 0.857; acromion 0.820 / 0.819; suprasternale 0.819 / 0.816; axilla 0.755 / 0.759; bust/nipple 0.731 / 0.720; natural waist 0.642 / 0.648; navel 0.602 / 0.602; iliac crest 0.607 / 0.609; trochanterion 0.51-0.53 (surveys disagree, see below); buttock protrusion 0.505 / 0.513; crotch 0.479 / 0.477; gluteal furrow 0.464 / 0.457; mid-thigh 0.381 / 0.378; mid-patella 0.28 / 0.28; tibiale 0.267 / 0.269; calf max girth 0.201 / 0.194; lateral malleolus 0.040 / 0.038.
- The two surveys **disagree on trochanterion** (0.529 both sexes in 1988 vs 0.513 M / 0.519 F in 2012) and **mid-patella** (0.287 / 0.281 vs 0.278 / 0.276), while stature, C7, acromion, navel and buttock heights agree to within 0.003. A 2.7 cm shift in one landmark with no shift in its neighbours points to a change in landmarking protocol, not a change in bodies. I could not open either report to confirm this.
- Women's C7 fraction also differs between surveys (0.864 in 1988 vs 0.857 in 2012) while men's does not (0.865 vs 0.864); this drives the different female C7-to-acromion drops (7.4 vs 6.1 cm). Cause unknown.
- The **natural waist coincides with the lowest rib** (within about 1 cm on average) and sits 5-7 cm above the iliac crest; the **navel coincides with the iliac crest** (within 0.5-1.6 cm). A mannequin can place "narrowest waist" at the bottom of the rib cage and "navel / trouser waist / high hip" at the iliac crest.
- The **gluteal furrow is below the crotch** by about 2.3-2.7 cm, and the buttock's maximum protrusion is 5-7 cm above the crotch.
- Because the fits have negative intercepts of −8 to −20 cm, using a fixed fraction overstates leg length for short people and understates it for tall ones: at 155 cm vs 190 cm stature the male crotch fit gives 0.468 vs 0.489 of stature.
- Eye height is derived assuming the eye-to-vertex distance is the same sitting and standing; the two surveys give 0.930 and 0.933-0.935, bracketing the Bodyspace 0.935-0.937.

### Gaps
- **Chin / menton height and head height (vertex to menton)**: not in either public raw file (ANSUR II has only `mentonsellionlength` and `tragiontopofhead`). The 1988 report has a "Menton-Top of Head" head-board dimension but I could not open [ADA209600](https://apps.dtic.mil/sti/pdfs/ADA209600.pdf) or [ADA241952](https://apps.dtic.mil/sti/pdfs/ADA241952.pdf). See section 2 Gaps for an unverified estimate.
- **Underbust level height**: no survey height found. Only the girth exists (ANSUR I `CHEST_CIRC-BELOW_BUST_`: 92.61 cm men, 76.97 cm women).
- **Minimum-ankle-girth level**: not measured as a height; only the lateral malleolus height (bone) is available. The minimum girth sits above the malleolus by an amount I could not source.
- **Mid-thigh**: no survey height; the value above is my midpoint of crotch and mid-patella.
- CAESAR (civilian, 1998-2002) landmark heights could not be retrieved; the reports are [Robinette et al. 2002, Vol. I](https://apps.dtic.mil/sti/pdfs/ADA406704.pdf) and [Harrison & Robinette 2002](https://apps.dtic.mil/sti/pdfs/ADA406674.pdf) (blocked). SizeUSA/SizeUK tables were not found.
- All height fractions are from soldiers (young, fit, screened for height/weight). Civilian vertical fractions are probably close (skeletal), but this was not verified against a civilian survey.

---

## 2. Segment lengths and ratios (head, neck, arm, hand, thigh, shank, sitting height, crotch ratio; where elbow and wrist fall)

### Takeaway
Upper arm is about 0.191 of stature in both sexes, forearm 0.152 (M) / 0.148 (F), hand 0.110, giving an upper-arm : forearm ratio of 1.25 (M) and 1.29 (F). With arms hanging, the elbow joint sits 2.5-3.5 cm below the natural waist (4-5 cm above the navel), the wrist is level with the crotch (within about 1 cm on average), and the fingertips reach mid-thigh. Sitting-height ratio is 0.523 (M) / 0.526 (F) and crotch height / stature is 0.48 for both sexes.

### Cited Findings

**Table 2A. Limb segments, ANSUR II (2012).** mean (SD) [5th / 50th / 95th] cm; fraction of stature. Computed from [ANSUR II raw data](https://www.openlab.psu.edu/ansur2/) ([mirror](https://github.com/marcin-chwedczuk/ansur_pgadmin_explorer/tree/main/data/raw)).

| Segment (variable) | Men cm | Men frac | Women cm | Women frac |
|---|---|---|---|---|
| Upper arm, `acromionradialelength` | 33.52 (1.75) [30.7 / 33.5 / 36.5] | 0.191 (0.006) | 31.12 (1.72) [28.3 / 31.1 / 34.0] | 0.191 (0.006) |
| Forearm, `radialestylionlength` | 26.79 (1.54) [24.4 / 26.7 / 29.5] | 0.152 (0.006) | 24.13 (1.52) [21.8 / 24.1 / 26.8] | 0.148 (0.007) |
| Hand, `handlength` | 19.33 (1.00) [17.7 / 19.3 / 21.0] | 0.110 (0.004) | 18.11 (1.01) [16.5 / 18.0 / 19.9] | 0.111 (0.005) |
| Palm, `palmlength` | 11.65 (0.62) | 0.066 | 10.87 (0.59) | 0.067 |
| Arm, acromion to wrist **(D)** = upper arm + forearm | 60.31 (3.05) [55.5 / 60.2 / 65.5] | 0.343 (0.010) | 55.25 (2.98) [50.7 / 55.1 / 60.5] | 0.339 (0.011) |
| Acromion to wrist, vertical **(D)** = acromial height − wrist height | 59.32 (3.17) | 0.338 (0.011) | 54.09 (2.98) | 0.332 (0.011) |
| Sleeve outseam, `sleeveoutseam` | 59.31 (3.08) [54.5 / 59.2 / 64.5] | 0.338 (0.011) | 54.36 (2.95) [49.7 / 54.2 / 59.4] | 0.334 (0.011) |
| Sleeve length spine-to-wrist, `sleevelengthspinewrist` | 89.59 (4.02) | 0.510 (0.015) | 80.67 (3.79) | 0.495 (0.014) |
| Shoulder-elbow length (elbow flexed), `shoulderelbowlength` | 36.37 (1.82) | 0.207 (0.006) | 33.43 (1.73) | 0.205 (0.006) |
| Forearm-hand length, `forearmhandlength` | 48.02 (2.33) | 0.273 (0.008) | 43.99 (2.34) | 0.270 (0.009) |
| Arm span, `span` | 181.42 (8.46) | 1.033 (0.027) | 166.03 (8.30) | 1.020 (0.029) |
| Thigh **(D)** = trochanterion − tibiale | 43.27 (2.76) [39.1 / 43.1 / 48.1] | 0.246 (0.011) | 40.76 (2.39) [36.9 / 40.7 / 44.6] | 0.250 (0.010) |
| Shank **(D)** = tibiale − lateral malleolus | 39.53 (2.45) [35.7 / 39.5 / 43.7] | 0.225 (0.008) | 37.50 (2.35) [33.8 / 37.4 / 41.5] | 0.230 (0.009) |
| Crotch to mid-patella **(D)** | 35.75 (2.41) [31.8 / 35.7 / 39.8] | 0.203 (0.010) | 33.33 (2.29) [29.7 / 33.3 / 37.1] | 0.205 (0.010) |
| Foot length, `footlength` | 27.12 (1.31) | 0.154 (0.005) | 24.63 (1.24) | 0.151 (0.005) |
| Sitting height, `sittingheight` | 91.83 (3.57) [86.0 / 91.8 / 97.7] | 0.523 (0.013) | 85.66 (3.31) [80.3 / 85.7 / 91.2] | 0.526 (0.014) |
| Subischial leg length **(D)** = stature − sitting height | 83.79 (4.65) | 0.477 (0.013) | 77.19 (4.44) | 0.474 (0.014) |
| Head + neck above C7 **(D)** = stature − cervicale | 23.89 (1.29) [21.8 / 23.9 / 26.0] | 0.136 (0.007) | 23.28 (1.19) [21.4 / 23.2 / 25.3] | 0.143 (0.007) |
| Face height, `mentonsellionlength` | 12.26 (0.67) | 0.070 | 11.31 (0.61) | 0.070 |
| Ear hole to top of head, `tragiontopofhead` | 13.12 (0.62) | 0.075 | 12.65 (0.66) | 0.078 |
| Head length (front-back), `headlength` | 19.95 (0.70) | 0.114 | 18.98 (0.75) | 0.117 |
| Head breadth, `headbreadth` | 15.43 (0.55) | 0.088 | 14.78 (0.52) | 0.091 |
| Head circumference, `headcircumference` | 57.44 (1.61) | 0.327 | 56.11 (1.94) | 0.345 |

**Table 2B. Ratios, ANSUR II** — mean (SD) [5th / 95th]. Same source.

| Ratio | Men | Women |
|---|---|---|
| Upper arm : forearm (acromion-radiale / radiale-stylion) | 1.253 (0.052) [1.167 / 1.338] | 1.292 (0.061) [1.196 / 1.396] |
| Forearm / upper arm | 0.800 (0.033) | 0.776 (0.037) |
| Hand / forearm | 0.723 (0.032) | 0.752 (0.036) |
| Thigh : shank ((trochanterion − tibiale) / (tibiale − malleolus)) | 1.096 (0.058) [1.010 / 1.200] | 1.089 (0.056) [1.005 / 1.182] |
| Sitting height / stature | 0.523 (0.014) [0.500 / 0.544] | 0.526 (0.014) [0.502 / 0.548] |
| Crotch height / stature | 0.482 (0.014) [0.459 / 0.506] | 0.480 (0.015) [0.456 / 0.505] |
| Arm span / stature | 1.033 (0.027) | 1.020 (0.029) |

- ANSUR I (1988) gives the same picture: upper arm 34.08 cm (0.194) men, 31.19 cm (0.191) women; forearm 26.99 cm (0.154) men, 24.34 cm (0.149) women; hand 19.38 cm (0.110) men, 18.05 cm (0.111) women; upper arm : forearm 1.264 men, 1.283 women; sitting-height ratio 0.521 men, 0.523 women; crotch / stature 0.477 men, 0.473 women — computed from [ANSUR I raw data](https://www.openlab.psu.edu/ansur/).
- Head + neck above the side neck point (ANSUR I, stature − `NECK_HT-LATERAL`): 24.63 cm (SD 1.22), 0.140 of stature in men; 23.29 cm (SD 1.08), 0.143 in women — [ANSUR I raw data](https://www.openlab.psu.edu/ansur/).

**Table 2C. Where the elbow, wrist and fingertips fall when the arms hang** — mean (SD) [5th / 95th] cm; positive = the arm landmark is above the body landmark.

| Comparison | Men | Women | Survey |
|---|---|---|---|
| Elbow joint (radiale) height **(D)** = acromial height − acromion-radiale length | 110.55 (5.01), 0.629 of stature | 102.39 (4.53), 0.629 | [ANSUR II](https://www.openlab.psu.edu/ansur2/) |
| Elbow vs natural waist | −2.54 (2.32) [−6.5 / +1.2] | −3.48 (2.56) [−7.8 / +0.8] | [ANSUR I](https://www.openlab.psu.edu/ansur/) |
| Elbow vs lowest rib | −1.52 (2.30) [−5.4 / +2.2] | −3.24 (2.10) [−6.7 / +0.2] | ANSUR II |
| Elbow vs navel | +4.90 (2.73) [+0.4 / +9.4] | +4.38 (2.51) [+0.3 / +8.7] | ANSUR II |
| Elbow vs iliac crest | +4.39 (2.61) [+0.1 / +8.6] | +2.82 (2.41) [−1.2 / +6.6] | ANSUR II |
| Wrist (measured `wristheight`) | 84.75, 0.482 | 79.42, 0.488 | ANSUR II |
| Wrist vs crotch | +0.16 (3.60) [−6.0 / +5.9] | +1.19 (3.52) [−4.9 / +6.7] | ANSUR II |
| Wrist vs crotch | +0.93 (3.57) | +1.90 (3.62) | ANSUR I |
| Wrist vs trochanterion | −5.34 (3.70) [−11.7 / +0.5] | −5.12 (3.41) [−10.9 / +0.2] | ANSUR II |
| Fingertip height **(D)** = wrist height − hand length | 65.42 (3.74), 0.372 | 61.31 (3.48), 0.376 | ANSUR II |
| Fingertip vs crotch | −19.17 (3.97) [−26.1 / −13.0] | −16.92 (4.01) [−23.9 / −10.9] | ANSUR II |
| Fingertip vs mid-patella | +16.59 (3.12) [+11.4 / +21.5] | +16.41 (3.05) [+11.1 / +21.2] | ANSUR II |

### Inferences
- **Elbow rule for the mannequin**: elbow joint centre at 0.629 × stature for both sexes, i.e. 1-2 % of stature below the narrowest waist and about 2.7 % above the navel. The old drawing rule "elbow at the waist" holds if "waist" means the natural waist, with the elbow 2.5-3.5 cm lower.
- **Wrist rule**: wrist crease at crotch level (0.48 of stature); the "wrist at the crotch" drawing rule is supported, with women's wrists about 1 cm higher than their crotch on average.
- **Fingertip rule**: fingertips at 0.37-0.38 of stature, which equals the mid-thigh level (0.378-0.382) derived in section 1.
- Derived acromion-to-wrist length via segments (60.31 / 55.25 cm) is only about 1 cm longer than the measured vertical drop from acromion to wrist (59.32 / 54.09 cm), so the arm hangs close to vertical and segment lengths can be stacked directly.
- The derived thigh and shank use the ANSUR II trochanterion, which sits lower than in ANSUR I; with the 1988 trochanterion (0.529) the thigh would be about 0.26 of stature and thigh : shank about 1.17. Treat thigh : shank as 1.09-1.17 depending on landmark convention.
- Sex differences in limb proportions are small: women have a relatively shorter forearm (0.148 vs 0.152) and smaller arm span / stature (1.020 vs 1.033); upper arm, hand, thigh and shank fractions are within 0.005.

### Gaps
- **Head height (vertex to menton) and "heads tall"**: no measured value could be retrieved. A search found only a low-authority page stating the average adult is about 7.5 heads tall — [FunFactz](https://funfactz.com/body/take-your-height-and-divide-by-eight-thats). What the data do establish: everything above C7 is 23.9 cm (M) / 23.3 cm (F), which caps head height. Unverified recollection (not confirmed in this session): Drillis & Contini as reproduced in Winter's *Biomechanics and Motor Control of Human Movement* give head height 0.130 × stature and chin height 0.870 × stature, i.e. about 7.7 heads; at ANSUR II statures that would be 22.8 cm (M) and 21.2 cm (F). Verify against the 1988 report's "Menton-Top of Head" before relying on it.
- **Drillis & Contini (1966) / Winter fractions** could not be read (the figure page [Human Kinetics excerpt](https://us.humankinetics.com/blogs/excerpt/anthropometry-measurements-lab-activity) and [OpenLab proportionality constants](https://www.openlab.psu.edu/2018/02/05/proportionality-constants) were blocked). Values I recall from Winter's figure, unverified here: eye 0.936, chin 0.870, shoulder 0.818, chest 0.720, elbow 0.630, hip 0.530, wrist 0.485, fingertip 0.377, knee 0.285, ankle 0.039, upper arm 0.186, forearm 0.146, hand 0.108, thigh 0.245, shank 0.246, foot length 0.152, shoulder width 0.259, hip width 0.191. If correct, they agree with the ANSUR results above to within about 0.005-0.01 for heights, and understate forearm (0.146 vs 0.148-0.152) and upper arm (0.186 vs 0.191) slightly. Search confirmed only that this model exists, is the most-used ratio set, and that its authors admit deviations up to 2 cm — [CNB2025 abstract](https://cnb2025.tecnico.ulisboa.pt/prog_cnb2025_web/abstracts_cnb225/ID_387_794_Resumo%20CNB2025%20-%20Drillis%20%20Contini_Final.pdf).
- **Neck length** as a separate segment: not measured. Available bounds: C7 is 0.99 cm (M) / 1.15 cm (F) above the side neck point (ANSUR I); C7 is 7.9 cm (M) / 6.6 cm (F) above suprasternale (ANSUR II).
- NASA-STD-3000 / RP-1024, Dreyfuss *Measure of Man and Woman*, and NHANES limb lengths (upper arm length, upper leg length) were not retrieved; the NHANES extract available here contains only height, weight, BMI and waist.

---

## 3. Where along each limb the maximum girths sit

### Takeaway
Only two girth levels are measured as heights in the surveys: maximum calf girth at 0.201 (M) / 0.194 (F) of stature, which is about 70 % of the way up from the floor to mid-patella, and the upper-thigh girth, which is taken at the gluteal furrow at 0.464 (M) / 0.457 (F). No survey value was found for the level of the bicep or forearm maximum.

### Cited Findings
- **Calf**: level of maximum calf circumference (`CALF_HT`) is 35.34 cm (SD 2.37) [31.6 / 39.3] in men and 31.61 cm (SD 2.40) [27.8 / 35.7] in women; 0.201 (SD 0.009) and 0.194 (SD 0.011) of stature — [ANSUR I raw data](https://www.openlab.psu.edu/ansur/).
- Calf level as a fraction of mid-patella height: 0.700 (SD 0.023) men, 0.689 (SD 0.029) women. As a fraction of the lateral malleolus (0) to mid-patella (1) span: 0.654 (SD 0.027) men, 0.641 (SD 0.035) women. The calf maximum is 15.15 cm (SD 1.33) below mid-patella in men and 14.25 cm (SD 1.45) in women — computed from [ANSUR I raw data](https://www.openlab.psu.edu/ansur/).
- **Thigh**: the survey's thigh circumference is taken at the gluteal-furrow level, 81.44 cm (0.464) men and 74.43 cm (0.457) women; that is 27 % (M) / 29 % (F) of the way down from trochanterion to mid-patella — computed from [ANSUR I raw data](https://www.openlab.psu.edu/ansur/).
- **Girth values going down the leg** (ANSUR I, mean (SD) cm): proximal thigh 59.65 (4.93) M / 58.03 (4.51) F; distal thigh 39.18 (2.71) / 37.75 (2.76); knee 38.64 (2.21) / 36.52 (2.33); calf 37.81 (2.54) / 35.24 (2.32); ankle 22.17 (1.30) / 20.53 (1.21) — [ANSUR I raw data](https://www.openlab.psu.edu/ansur/).
- **Girth values going down the leg** (ANSUR II, mean (SD) cm): thigh 62.51 (5.85) M / 61.62 (5.58) F; lower thigh 40.93 (3.19) / 40.07 (3.52); calf 39.23 (2.97) / 37.33 (2.85); ankle 22.93 (1.47) / 21.57 (1.49) — [ANSUR II raw data](https://www.openlab.psu.edu/ansur2/).
- **Girth values down the arm** (ANSUR I, mean (SD) cm): arm at axilla 33.50 (2.71) M / 29.16 (2.44) F; biceps flexed 33.75 (2.71) / 28.13 (2.27); elbow extended 27.71 (1.53) / 23.83 (1.34); forearm flexed 30.35 (1.88) / 25.37 (1.51); wrist 17.42 (0.83) / 15.12 (0.69) — [ANSUR I raw data](https://www.openlab.psu.edu/ansur/). ANSUR II: biceps flexed 35.81 (3.46) / 30.56 (3.08); forearm flexed 31.01 (2.20) / 26.41 (1.85); wrist 17.59 (0.90) / 15.48 (0.78) — [ANSUR II raw data](https://www.openlab.psu.edu/ansur2/).
- Proximal thigh girth is 0.606 (SD 0.020) of hip girth in men and 0.600 (SD 0.020) in women — computed from [ANSUR I raw data](https://www.openlab.psu.edu/ansur/).
- Standard practice for the calf site is "the level of the largest circumference", found by moving the tape up and down, tape horizontal — [Topend Sports calf girth protocol](https://www.topendsports.com/testing/tests/girth-calf.htm) (via search summary).

### Inferences
- For the mannequin: put the calf maximum at 0.70 × knee height (mid-patella), the thigh maximum at the gluteal furrow (crotch height minus 2-3 cm), and taper the thigh from about 60 % of hip girth at the furrow to about 40 cm just above the knee.
- In unflexed standing arms the upper-arm girth at the axilla (33.5 / 29.2 cm) is essentially equal to the flexed-biceps girth (33.7 / 28.1 cm) in ANSUR I, so a relaxed mannequin arm can be near-cylindrical from armpit to mid-upper-arm and need not show a pronounced bicep peak.
- The forearm maximum must lie in the proximal part of the forearm because the elbow girth (27.7 / 23.8 cm) is smaller than the forearm girth (30.3 / 25.4 cm) and the wrist is far smaller (17.4 / 15.1 cm); the exact level is not given by any source found.

### Gaps
- **Level of maximum bicep girth and maximum forearm girth** (as a fraction of segment length): not found. ISAK lists "Forearm (maximum)" and "Calf (maximum)" as girth sites, but the manual text giving positions was not accessible ([ISAK manual on Scribd](https://www.scribd.com/doc/238114566/ISAK-BOOK), not opened). Common convention I recall but could not verify: relaxed arm girth at mid acromiale-radiale (50 % of upper arm), forearm maximum within roughly the proximal third below the elbow.
- **True maximum thigh girth level** on a standing body may be slightly below the gluteal furrow; surveys measure at the furrow by definition, so the true maximum is not separately recorded.
- **Minimum ankle girth level**: not found.
- ISO 8559-1 and ISO 7250-1 definitions were not accessible (paywalled; only preview pages surfaced).

---

## 4. Shoulder geometry: biacromial vs bideltoid, slope angle, drop, shoulder length

### Takeaway
Bone-to-bone shoulder width (biacromial) is about 81-82 % of the outer width over the deltoids, a difference of 8.5-9.5 cm (about 4.5 cm per side). The shoulder line from the side of the neck to the acromion drops 6.7 cm (M) / 6.3 cm (F) over a 15.0 / 14.5 cm shoulder length, which is a slope of about 26 degrees for both sexes; apparel standards quote 23-25 degrees and pattern textbooks 19-21 degrees.

### Cited Findings

**Table 4A. Breadths** — mean (SD) [5th / 50th / 95th] cm.

| Dimension | Men | Women | Survey |
|---|---|---|---|
| Biacromial breadth | 41.57 (1.92) [38.4 / 41.5 / 44.7]; 0.237 of stature | 36.54 (1.83) [33.5 / 36.5 / 39.6]; 0.224 | [ANSUR II](https://www.openlab.psu.edu/ansur2/) |
| Bideltoid breadth | 51.04 (3.25) [45.9 / 50.9 / 56.7]; 0.291 | 45.03 (2.87) [40.6 / 45.0 / 49.9]; 0.277 | ANSUR II |
| Bideltoid − biacromial | 9.48 (2.35) [5.8 / 9.4 / 13.5] | 8.50 (2.38) [4.9 / 8.3 / 12.6] | ANSUR II |
| Biacromial / bideltoid | 0.816 (0.037) [0.756 / 0.877] | 0.813 (0.044) [0.738 / 0.882] | ANSUR II |
| Biacromial breadth | 39.70 (1.80) [36.8 / 39.7 / 42.7]; 0.226 | 36.26 (1.74) [33.3 / 36.3 / 39.0]; 0.223 | [ANSUR I](https://www.openlab.psu.edu/ansur/) |
| Bideltoid breadth | 49.18 (2.59) [45.0 / 49.1 / 53.4]; 0.280 | 43.26 (2.26) [39.7 / 43.1 / 47.1]; 0.266 | ANSUR I |
| Bideltoid − biacromial | 9.48 (1.96) [6.5 / 9.4 / 12.7] | 7.00 (1.77) [4.4 / 6.8 / 10.2] | ANSUR I |
| Biacromial / bideltoid | 0.808 (0.033) | 0.839 (0.036) | ANSUR I |
| Chest breadth | 28.94 (1.83) | 26.93 (1.86) | ANSUR II |
| Interscye (back, armhole to armhole) `interscyei` | 43.09 (3.53) | 37.34 (2.98) | ANSUR II |
| Neck base circumference | 43.46 (2.57) | 37.12 (1.97) | ANSUR II |
| Neck circumference | 39.77 (2.58) | 32.98 (1.92) | ANSUR II |

**Table 4B. Shoulder line** — mean (SD) [5th / 50th / 95th].

| Quantity | Men | Women | Survey |
|---|---|---|---|
| Shoulder length, side neck point to acromion (surface) | 14.98 (1.05) [13.3 / 15.0 / 16.7] cm | 13.54 (1.03) [12.0 / 13.5 / 15.3] cm | [ANSUR II](https://www.openlab.psu.edu/ansur2/) |
| Shoulder length, same definition | 15.05 (1.10) [13.3 / 15.0 / 16.9] cm | 14.47 (1.08) [12.7 / 14.5 / 16.2] cm | [ANSUR I](https://www.openlab.psu.edu/ansur/) |
| **Vertical drop, side neck point to acromion** **(D)** = `NECK_HT-LATERAL` − `ACROMION_HT` | 6.70 (1.17) [4.8 / 6.7 / 8.7] cm | 6.29 (1.11) [4.5 / 6.3 / 8.1] cm | ANSUR I |
| Drop / shoulder length | 0.444 (0.062) | 0.433 (0.061) | ANSUR I |
| **Slope angle** **(D)** = asin(drop / shoulder length) | 26.4° (4.0) [20.1 / 26.4 / 33.0] | 25.7° (3.9) [19.2 / 25.8 / 32.0] | ANSUR I |
| Slope angle, alternative **(D)** = atan(drop / (biacromial/2 − neck-base circumference/2π)) | 26.5° (3.7) [20.3 / 32.5] | 26.4° (3.7) [19.8 / 32.2] | ANSUR I |
| Horizontal run of the shoulder line **(D)** = sqrt(length² − drop²) | 13.44 (0.96) cm | 12.99 (0.94) cm | ANSUR I |
| Implied half-width of neck base **(D)** = biacromial/2 − horizontal run | 6.41 (0.78) cm | 5.14 (0.73) cm | ANSUR I |
| Vertical drop, C7 to acromion **(D)** | 7.66 (1.36) [5.4 / 10.0] cm | 6.06 (1.33) [3.9 / 8.2] cm | ANSUR II |
| Vertical drop, C7 to acromion **(D)** | 7.69 (1.40) cm | 7.44 (1.36) cm | ANSUR I |
| Angle from C7 to acromion **(D)** = atan(drop / (biacromial/2)) | 20.2° (3.2) [14.9 / 25.3] | 18.3° (3.6) [12.3 / 24.0] | ANSUR II |
| Acromion above armpit | 11.17 (1.21) cm | 9.61 (1.12) cm | ANSUR II |

- ASTM D5585-95 (2001) (US misses sizes 2-20) lists shoulder slope as 23 degrees for all sizes — [ASTM D5585-95(2001) sample](https://cdn.standards.iteh.ai/samples/6686/49f79c7b53444f04b766d4cf20aa39ae/ASTM-D5585-95-2001-.pdf) (via search summary).
- ASTM D6240-98 (US men 34-60 regular) lists shoulder slope as 25 degrees for every size, measured with a plastic goniometer, and across-shoulder width 44.45 cm for size 40 — [ASTM D6240-98 sample](https://cdn.standards.iteh.ai/samples/13343/f94ce20e621e475d92d5daf043156a42/ASTM-D6240-98.pdf) (via search summary).
- A Chinese garment-pattern textbook cited in a 2025 suit-pattern study gives about 19 degrees for women and 21 degrees for men, with a flat / natural / sloping classification of [3.3°, 18.09°], [18.09°, 21.39°], [21.39°, 33.8°]; the same study places the typical young female shoulder at 21-23 degrees — [Journal of Fiber Bioengineering and Informatics article](https://ojs.global-sci.org/index.php/JFBI/article/view/13167) (via search summary).
- A garment-fitting patent treats 25 degrees as the "normal" shoulder — [US patent 7584122](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/7584122) (via search summary).

### Inferences
- Default mannequin values: shoulder length 15.0 cm (M) / 14.0 cm (F); drop from side neck point to acromion 6.7 / 6.3 cm; slope 23-26 degrees for both sexes with a population SD of about 4 degrees (5th-95th roughly 20-33 degrees). **There is no meaningful sex difference in slope angle** in the 1988 data (26.4 vs 25.7 degrees).
- The spread between sources (19-21, 23-25, 26 degrees) is mostly a definition issue: where the neck end is taken (C7 gives 18-20 degrees; side neck point gives about 26), and whether the angle is read with a goniometer on the surface or computed from landmarks. A tailoring "shoulder slope" input should state which.
- My asin-based angle slightly overstates the true angle because shoulder length is a surface (curved) distance, longer than the straight chord; the independent atan-based estimate gives the same 26 degrees, so the bias is small.
- The deltoid adds about 4.7 cm (M) / 4.2 cm (F) per side beyond the acromion in the 2012 data. A mannequin whose input is tailor's "shoulder width" (acromion to acromion) should add about 9 cm for the widest upper-body width; the ratio 0.81-0.82 is stable across sexes.
- Men's biacromial breadth is 1.9 cm larger in 2012 than 1988 (41.57 vs 39.70 cm) while women's is unchanged (36.54 vs 36.26); bideltoid grew in both (about +1.9 cm). Likely a mix of heavier bodies (male BMI 25.4 to 27.7) and measurement differences.
- Female shoulder length differs between surveys (13.54 vs 14.47 cm); male does not (14.98 vs 15.05). Use 14 cm as a compromise for women.

### Gaps
- No directly **measured** shoulder slope angle from a large survey (ANSUR, CAESAR, SizeUSA, SizeKorea) was found; the 26 degree figure is my derivation from two heights and a surface length.
- Tailor's across-back shoulder width (acromion to acromion over C7, surface) is not in ANSUR; only the ASTM men's size 40 value (44.45 cm) was found, versus 41.57 cm straight biacromial in ANSUR II men.
- ISO 8559-1 shoulder-slope definition not accessible.

---

## 5. Male vs female differences in proportions

### Takeaway
In these surveys men and women have almost the same vertical proportions: leg-length ratio differs by under 0.5 % of stature. The real sex differences are horizontal: men's shoulders are 21 % wider than their hips (bone to surface), women's only 4 %, and women's waist-to-hip girth ratio is about 0.75-0.84 against men's 0.85-0.92.

### Cited Findings

**Table 5A. Sex comparison** — mean (SD). ANSUR II from [raw data](https://www.openlab.psu.edu/ansur2/); ANSUR I from [raw data](https://www.openlab.psu.edu/ansur/).

| Proportion | Men | Women | Survey |
|---|---|---|---|
| Crotch height / stature | 0.482 (0.014) | 0.480 (0.015) | ANSUR II |
| Crotch height / stature | 0.477 (0.014) | 0.473 (0.015) | ANSUR I |
| Sitting height / stature | 0.523 (0.014) | 0.526 (0.014) | ANSUR II |
| Sitting height / stature | 0.521 (0.014) | 0.523 (0.015) | ANSUR I |
| C7 to navel (vertical) / stature | 0.263 (0.012) | 0.255 (0.012) | ANSUR II |
| C7 to natural waist (vertical) / stature | 0.223 (0.010) | 0.216 (0.013) | ANSUR I |
| Back waist length to navel level / stature | 0.272 (0.014) | 0.261 (0.014) | ANSUR II |
| Natural waist to crotch (vertical) / stature | 0.165 (0.011) | 0.175 (0.013) | ANSUR I |
| Natural waist height / stature | 0.642 (0.012) | 0.648 (0.014) | ANSUR I |
| Bust / nipple height / stature | 0.735 (0.011) | 0.719 (0.014) | ANSUR II |
| Head + neck above C7 / stature | 0.136 (0.007) | 0.143 (0.007) | ANSUR II |
| Biacromial / stature | 0.237 (0.010) | 0.224 (0.010) | ANSUR II |
| Bideltoid / stature | 0.291 (0.018) | 0.277 (0.017) | ANSUR II |
| Hip breadth (standing) | 34.57 (2.42) cm; 0.197 (0.013) | 35.38 (2.67) cm; 0.217 (0.015) | ANSUR II |
| Bicristal (pelvis bone) breadth | 27.54 (1.75) cm; 0.157 | 27.33 (2.23) cm; 0.168 | ANSUR II |
| Waist breadth (navel level) | 32.64 (3.47) cm | 29.99 (3.30) cm | ANSUR II |
| **Biacromial / hip breadth** | 1.206 (0.075) [1.084 / 1.331] | 1.037 (0.079) [0.912 / 1.169] | ANSUR II |
| Biacromial / hip breadth | 1.164 (0.067) | 1.062 (0.073) | ANSUR I |
| **Bideltoid / hip breadth** | 1.479 (0.072) [1.366 / 1.599] | 1.276 (0.071) [1.162 / 1.395] | ANSUR II |
| Biacromial / bicristal | 1.513 (0.090) | 1.344 (0.110) | ANSUR II |
| Hip breadth − biacromial | −6.99 (2.26) cm | −1.15 (2.74) cm | ANSUR II |
| Waist (navel) / hip girth | 0.921 (0.059) | 0.842 (0.060) | ANSUR II |
| Natural waist / hip girth | 0.853 (0.042) | 0.750 (0.043) | ANSUR I |
| Chest / waist (navel) girth | 1.132 (0.068) | 1.105 (0.069) | ANSUR II |
| Underbust / bust girth | 0.934 (0.017) | 0.849 (0.029) | ANSUR I |
| Waist breadth / waist depth | 1.383 (0.100) | 1.419 (0.112) | ANSUR II |
| Chest breadth / chest depth | 1.148 (0.099) | 1.097 (0.092) | ANSUR II |
| Upper arm : forearm | 1.253 (0.052) | 1.292 (0.061) | ANSUR II |

**Table 5B. Main girths** — mean (SD) [5th / 95th] cm.

| Girth | Men | Women | Survey |
|---|---|---|---|
| Chest / bust | 105.87 (8.74) [92.2 / 120.7] | 94.69 (8.27) [82.4 / 109.4] | ANSUR II |
| Waist at navel | 94.06 (11.17) [76.8 / 113.1] | 86.09 (9.99) [71.0 / 104.0] | ANSUR II |
| Hip (buttock) | 101.95 (7.67) [89.9 / 114.9] | 102.13 (7.59) [90.1 / 115.6] | ANSUR II |
| Chest / bust | 99.14 (6.91) [88.6 / 111.4] | 90.71 (6.35) [81.4 / 102.2] | ANSUR I |
| Underbust | 92.61 (6.55) | 76.97 (5.10) [69.6 / 86.2] | ANSUR I |
| Natural waist | 83.99 (7.40) [73.0 / 97.0] | 72.55 (6.30) [63.7 / 84.0] | ANSUR I |
| Waist at navel | 86.24 (8.64) | 79.19 (8.27) | ANSUR I |
| Hip (buttock) | 98.37 (6.22) [89.0 / 108.7] | 96.69 (6.02) [87.3 / 106.8] | ANSUR I |

- US civilian adults are shorter and much larger in the waist than soldiers: NHANES 2015-2018 (age 20+, weighted) height 175.26 cm men / 161.21 cm women, waist 102.86 / 98.37 cm, BMI 29.4 / 29.8, versus ANSUR II stature 175.62 / 162.85 cm, navel-level waist 94.06 / 86.09 cm, BMI 27.7 / 25.5 — computed from [NHANES extract](https://github.com/marcin-chwedczuk/ansur_pgadmin_explorer/tree/main/data/raw) and [ANSUR II raw data](https://www.openlab.psu.edu/ansur2/); official NHANES report [Vital Health Stat 3(46)](https://stacks.cdc.gov/view/cdc/100478) (not opened). NHANES waist is measured at the iliac crest, so it is close to but not identical with the ANSUR navel-level waist.
- British adults 19-65 (Bodyspace): hip (trochanter) height 935 mm men / 820 mm women against stature 1745 / 1620 mm, i.e. 0.536 vs 0.506 — [Scribd anthropometrics notes](https://www.scribd.com/document/252821005/Anthropometrics-Notes) (via search summary). This suggests a larger sex difference in leg ratio in that civilian estimate than in the US Army data (0.513 vs 0.519 trochanterion in ANSUR II, 0.529 vs 0.529 in ANSUR I).

### Inferences
- For the mannequin, **use the same vertical fractions for men and women** except: bust point about 1.5 % of stature lower in women (0.719 vs 0.735), natural waist about 0.6-1 % higher in women, and head + neck about 0.7 % larger in women (smaller body, similar head).
- Women therefore have a **shorter upper torso** (C7 to natural waist 0.216 vs 0.223) and a **longer rise** (natural waist to crotch 0.175 vs 0.165) than men, at equal leg-length ratio.
- Width defaults: hip breadth 0.197 (M) / 0.217 (F) of stature; biacromial 0.237 / 0.224; bideltoid 0.291 / 0.277. In women hip breadth about equals biacromial breadth (hips 1.2 cm narrower on average); in men hips are 7 cm narrower than the acromia.
- The civilian vs military gap is in girths, not in skeleton: NHANES waists are 9-12 cm larger at nearly the same height. Mannequin girth defaults based on ANSUR will look slim relative to the average US shopper.
- The Bodyspace hip-height sex gap (3 percentage points) conflicts with ANSUR (near zero). Bodyspace values are estimates built by ratio scaling, and the copy consulted is a secondary reproduction, so I weight ANSUR more heavily.

### Gaps
- No civilian survey with full landmark heights (CAESAR, SizeUSA, SizeUK) could be opened to confirm that the near-zero sex difference in leg ratio holds outside the military.
- No data retrieved on ethnic/population differences in sitting-height ratio, which are known to exist and can exceed the sex difference.

---

## 6. How fashion models, fit models and industry dress forms differ from population averages

### Takeaway
Runway and lingerie-show models are about 15 cm taller than the average US woman (roughly 177 cm vs 161 cm) with bust-waist-hip near 82-84 / 60-63 / 87-89 cm, against 91 / 73 / 97 cm for 1988 female soldiers and a 98 cm average civilian waist today. Industry misses standards and fit forms sit between the two: the ASTM misses size 8 is 89 cm bust / 68.5 cm waist with a 23 degree shoulder. No study measuring models' leg-to-height ratio was found.

### Cited Findings
- **Victoria's Secret Fashion Show models, 1995-2018** (239 models, measurements taken from a model directory, not measured by the researchers): bust fell from 32.9 in (83.6 cm) to 32 in (81.3 cm); waist from 24.7 in (62.7 cm) to 23.6 in (59.9 cm); hips from 34.9 in (88.6 cm) to 34.4 in (87.4 cm); dress size from 5.2 to 3.7; waist-to-hip ratio stayed about 0.7 and height stayed constant at about 5 ft 10 in (177.8 cm) (one outlet says 5 ft 11 in) — [Boston University summary of Maymone et al., Aesthetic Surgery Journal](https://www.bu.edu/articles/2020/victorias-secret-models-thinner-trend), [WBUR coverage](https://www.wbur.org/news/2020/01/03/victorias-secret-models-thinner) (via search summary; cm conversions mine).
- The same study contrasts this with the average American woman, whose dress size is between a misses 16 and 18 — [BU School of Medicine release](https://www.bumc.bu.edu/busm/2020/01/02/unattainable-standards-of-beauty-for-todays-woman) (via search summary).
- **25-year dataset of 793,199 model records** (ads, covers, runway, editorial): mean height, waist and hips were stable; bust declined from about 85 cm to 82 cm; the SD of all measurements roughly doubled since the early 2000s (hip SD from 2 cm to 4 cm), reflecting selective hiring of a few plus-size models alongside very thin ones — [Cultural evolution of human beauty standards, arXiv 2512.08861](https://arxiv.org/html/2512.08861v1), [PsyPost write-up](https://www.psypost.org/new-research-shows-fashions-plus-size-models-are-still-smaller-than-the-average-american-woman/) (via search summary).
- **Models vs general women (measured)**: waist 62.2 cm in models vs 66.3 cm in controls; hip 89.7 cm vs 90.5 cm (not significant); models had lower BMI, waist-to-hip ratio and body fat — [PMC5772072](https://pmc.ncbi.nlm.nih.gov/articles/PMC5772072) (via search summary; country and sample size not retrieved).
- **Models vs non-models**: waist 64.7 vs 74.1 cm; hip 89.0 vs 96.1 cm; bust 80.6 vs 85.8 cm; shoulder width 35.2 cm in models vs 32.1 cm in non-models — [PMC6915807 table 4](https://pmc.ncbi.nlm.nih.gov/articles/PMC6915807/table/table4) (via search summary; measurement definitions not retrieved).
- **Model height**: a tally of 40 top models gave an average of about 5 ft 9.5 in (176.5 cm) — [Who What Wear](https://www.whowhatwear.com/average-model-height) (journalistic, via search summary).
- **Fit models**: a typical American female fit model is described as 5 ft 4 in to 5 ft 9 in (162.6-175.3 cm), bust about 34 in (86.4 cm), waist about 26 in (66.0 cm), hips about 37 in (94.0 cm) — [Wikipedia, Fit model](https://en.wikipedia.com/wiki/Fit_model) (secondary, via search summary).
- **Runway sample size**: the dominant runway body is UK size 8 (US size 4) or smaller, attributed to sample collections being made in a single size — [StarNow](https://www.starnow.com/magazine/article/does-the-perfect-model-body-exist-78167/) (via search summary).
- **ASTM D5585-95 (2001), misses size 8** (US industry body-measurement standard): bust about 89.0 cm, waist about 68.5 cm, hip height 32 in (81.3 cm), high-hip height 91.4 cm, crotch height about 29.5 in (74.9 cm), knee height 18 in (45.7 cm), shoulder slope 23 degrees — [ASTM D5585-95(2001) sample](https://cdn.standards.iteh.ai/samples/6686/49f79c7b53444f04b766d4cf20aa39ae/ASTM-D5585-95-2001-.pdf) (via search summary; the standard states inch and metric tables are not exact equivalents). This edition was withdrawn in 2010; the current edition is [D5585-21](https://store.astm.org/d5585-21.html), sizes 00-20, values not retrieved.
- **ASTM D6240-98, men's size 40 regular**: cervicale height 153.67 cm, crotch height (inseam) 82.55 cm, across-shoulder width 44.45 cm, shoulder slope 25 degrees — [ASTM D6240-98 sample](https://cdn.standards.iteh.ai/samples/13343/f94ce20e621e475d92d5daf043156a42/ASTM-D6240-98.pdf) (via search summary). Current edition is [D6240/D6240M-24](https://store.astm.org/d6240_d6240m-24.html), chest 34-52 in Short/Regular/Tall, values not retrieved.
- **Alvanon**: the AlvaForm Studio range is built on Alvanon's "ASTM US Missy Standard", generated from 3D body scans of US consumers, i.e. intended to represent a typical missy customer, not a runway model — [Textile World](https://www.textileworld.com/textile-world/new-products/2012/07/alvanon-launches-alvaform-studio-mannequin/), [Apparel News](https://www.apparelnews.net/news/2012/may/25/alvanon-launches-new-realistic-fashion-form/) (via search summary; no dimensions given).
- **Population reference for comparison**: US women 20+, NHANES 2015-2018, weighted mean height 161.21 cm (SD 6.97), waist 98.37 cm — computed from [NHANES extract](https://github.com/marcin-chwedczuk/ansur_pgadmin_explorer/tree/main/data/raw); female soldiers 1988 bust 90.71 cm, natural waist 72.55 cm, hip 96.69 cm at 162.94 cm — [ANSUR I raw data](https://www.openlab.psu.edu/ansur/); female soldiers 2012 bust 94.69 cm, navel waist 86.09 cm, hip 102.13 cm at 162.85 cm — [ANSUR II raw data](https://www.openlab.psu.edu/ansur2/).

### Inferences
- A 177-178 cm model is about 2.3 SD above the US female mean height ((177.8 − 161.2) / 6.97 = 2.38), i.e. roughly the 99th percentile; her hip girth (87-89 cm) is near the 5th percentile of female soldiers (87.3 cm in 1988, 90.1 cm in 2012) and her waist (60-63 cm) is below the 5th percentile natural waist of 1988 female soldiers (63.7 cm).
- Girth-to-height ratios make the difference concrete: model hip / height is about 0.50 (88 / 177.8) vs 0.594 for 1988 female soldiers; model waist / height about 0.34-0.35 vs 0.446 natural waist.
- Models' waist-to-hip ratio of about 0.70 is below the female-soldier natural-waist mean of 0.750 (SD 0.043) but well within its range (5th percentile 0.687).
- ASTM proportions within the standard are close to survey proportions around the hip: misses size 8 hip level is 6.4 cm above the crotch (81.3 − 74.9 cm) against 5.1-6.7 cm for buttock-protrusion above crotch in female soldiers; high hip is 10.1 cm above the hip level. ASTM knee height / crotch height is 0.610 vs 0.574 (ANSUR II) to 0.595 (ANSUR I) for women.
- ASTM men's size 40 has crotch / cervicale height of 0.537 against 0.551-0.558 in male soldiers, i.e. the standard's inseam is about 2-3 cm shorter than a soldier of the same C7 height, consistent with a trouser-inseam convention that stops short of the anatomical crotch.
- A "fashion" preset for the mannequin can be approximated as: height 176-178 cm, bust 81-84, waist 60-63, hips 87-89 cm, shoulders about 3 cm wider than average, with the same vertical landmark fractions shifted by the stature regressions in section 1 (which already give taller people proportionally longer legs: crotch fraction 0.489 at 178 cm vs 0.479 at 161 cm for women using the ANSUR II fit).

### Gaps
- **Leg-length ratio of fashion models**: no study with measured inseam, crotch height or sitting height for models was found. Literature located covers only preferences for higher leg-to-body ratio in attractiveness ratings — [Bertamini & Bennett 2009](https://www.liverpool.ac.uk/~kmb/MyPublishedPapers/bertaminibennett2009.pdf) (via search summary) — not measurements of models. The claim that models have proportionally longer legs is therefore unverified here beyond what the stature regression predicts.
- **Stature rows of ASTM D5585 and D6240** were not retrieved, so ASTM landmark heights cannot be expressed as fractions of stature. My unverified recollection is that D5585-95 size 8 stature is 65.5 in (166.4 cm), which would make its crotch height 0.450 of stature, well below the 0.48 measured in surveys; confirm before use.
- **ASTM D5585-11 / -21, D6240-12 / -24, D6960 (plus), Alvanon and Wolf form dimension tables**: not accessible (paywalled or blocked). No numeric Wolf form data found at all.
- Male fashion-model measurements: nothing found.
- Model data are mostly agency-reported "card" measurements, not measured values, and likely understate girths; the two PMC studies appear to be measured but I could not read their methods.
