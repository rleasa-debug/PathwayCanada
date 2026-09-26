# Pathways Canada Compliance Registry (2026 Stable)

This registry records the compliance controls established to align Pathways Canada with modern privacy laws (Bill C-27/CPPA) and branding reliability audits.

## 1. Explainable AI & Right to Explanation (Bill C-27 / CPPA)

In accordance with Section 62 of the Consumer Privacy Protection Act (CPPA / Bill C-27) regarding automated decision systems, Pathways Canada provides a fully explainable, deterministic matchmaking model for all secondary to post-secondary transitions. 

### Weighting Algorithm
The program match likelihood ($Match\%$) is calculated locally in the student's browser context using the following weights:
$$Match \% = (0.60 \times GPA) + (0.30 \times \text{Prerequisites}) + (0.10 \times \text{Regional Factors})$$

- **Academic Average (60% weight):** GPA score computed using the Top 6 Grade 12 (or Grade 11) admission courses compared against target admission cutoffs. If the student meets or exceeds the cutoff, the score is calculated dynamically up to 100 points. If the student is below the cutoff, points are scaled down at a rate of 6.0 points per percentage point gap.
- **Prerequisite Requirements (30% weight):** Binary check for core STEM/Business/English courses matching target requirements. Program match scores are penalized if mandatory subjects are missing.
- **Geographic Residency (10% weight):** 100 points for matching the provincial institution standard (default Ontario "ON"), and 70 points for out-of-province matching.

### Safety Guarantee Constraint
To ensure algorithmic fairness, any student profile where the top 6 admission GPA exceeds 90% and all prerequisite requirements are met is guaranteed to receive at least "The Longshot" status (minimum 60% match), eliminating any risk of the algorithm erroneously categorizing high-performing candidates in "High Climb" (<60% Match) without structural justification.

---

## 2. Brand Asset & Logo Retrieval Stability

To avoid service failures caused by the late 2025 deprecation of Clearbit's public API, all logo retrievals have been migrated to the authenticated **Logo.dev** API:
`https://img.logo.dev/{domain}?token={token}`

- **Active Token Routing:** Configured to dynamically load publishable tokens via Vite environment keys (`VITE_LOGODEV_TOKEN`) with local dev fallback to `'pk_mock_logo_dev_token_placeholder'`.
- **Crest SVG Fallback:** In the event of a Logo.dev image failure or network error, the layout handles errors using an image `onerror` fallback that loads a dynamically generated inline SVG squircle containing derived initials (e.g. "UT" for Toronto, "UW" for Waterloo, "MCG" for McGill, "MAC" for McMaster) colored with the institution's specific brand gradient.
