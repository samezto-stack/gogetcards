/*
 * Gives a partner site the full four-currency ladder its Whop storefront
 * issued, in the partnerExperience config.
 *
 * WHY A SCRIPT AND NOT THE ADMIN FORM. Each site carries 48 plan ids across
 * four markets. Typing them into the settings page is 48 chances per site to
 * transpose a character into a field nothing validates until a customer
 * reaches checkout and the plan does not resolve.
 *
 * SAFE TO RUN TWICE. An existing entry is updated in place and keeps its id,
 * its group and its order stats, so re-running never duplicates a site or
 * resets what it has sold. Nothing is ever deleted.
 *
 * IT MATCHES ON THE PLANS, NOT ONLY THE URL. Sites listed here are not all
 * new: The Bindery has been taking orders since long before this script
 * existed, and is recorded under whatever URL was typed into the settings
 * page then — possibly a custom domain rather than the onrender host below.
 * Matching on the URL alone would miss it and add a SECOND copy of a site
 * already in the rotation, which is worse than not running at all. See
 * findRow.
 *
 * DRY RUN BY DEFAULT. It prints what it would change and writes nothing.
 * Pass --apply to commit the change.
 *
 *   MONGODB_URI=... node scripts/add-partner-sites.js
 *   MONGODB_URI=... node scripts/add-partner-sites.js --apply
 */
const mongoose = require('mongoose');
const crypto = require('crypto');
const SiteConfig = require('../models/SiteConfig');
const partnerRotation = require('../services/partnerRotation');
const { MARKETS } = require('../config/markets');

/* The step for each market, in cents. These are the rungs the price grid is
   built from; a site whose unit does not match its plans sells the wrong
   quantity, so they are stated here rather than defaulted. */
const UNIT_CENTS = { US: 7499, CA: 10999, UK: 5999, EU: 6999 };

const SITES = [
  {
    name: "Print Ready",
    url: "https://print-ready.onrender.com/services/artwork-preflight",
    plans: [
      "plan_fA1bHaEwt4nTI",
      "plan_bP3bhT18sMsCC",
      "plan_EkCORAYEIMDvC",
      "plan_zd6OyK4FbRrqG",
      "plan_vZQMhVVZI5oKr",
      "plan_w2dM9Wc3r4SZ4",
      "plan_QIkLfNwLuuBPG",
      "plan_MWok7aWPSAGHe",
      "plan_ZywvNA77GFuMU",
      "plan_aTCeRZsO5Psrd",
      "plan_SHCHajnUNGfda",
      "plan_kgtyyN2aTZxn1",
    ],
    ladders: {
      CA: [
        "plan_1lahjB2OJk5Hx",
        "plan_pKrnK2fTdtFao",
        "plan_J3hztfCp0GoL2",
        "plan_tFJg87XzywCrN",
        "plan_ztccEPDIh6TWR",
        "plan_mL3ZGeSv2Lgo8",
        "plan_a3DYXA59b83Sb",
        "plan_OBQQeCpBq7K5S",
        "plan_MI8zTY29CjkVw",
        "plan_T8pFLKYGRaeVT",
        "plan_mRiN8SVY6qM3R",
        "plan_JK1b6cVrAhIUA",
      ],
      UK: [
        "plan_vv0bLBF2o9SSx",
        "plan_XXLsCVvZh0yff",
        "plan_sGPrJhcgSc67c",
        "plan_sA84Oz7QjErqW",
        "plan_b2vPaKvrX8aXT",
        "plan_eYVX5OZ0O8dZv",
        "plan_8EO3NEnKNDsz6",
        "plan_tFNSDuOTQER7J",
        "plan_h0NyyBc37B3RL",
        "plan_vh47OusABhgYK",
        "plan_MuzTbQ7GtZywv",
        "plan_rMyt5j7MNjhZK",
      ],
      EU: [
        "plan_Wim7WDjUIu606",
        "plan_hLfdWgnlit3GW",
        "plan_iYjoOvhlPBmAC",
        "plan_6Ce36Jw2D4Wp0",
        "plan_p0TF6nj8JUBlX",
        "plan_U9BOXzEkqQeeG",
        "plan_EoZV2riDerssi",
        "plan_5hoRngLCFEMGx",
        "plan_vcPlb6Yx03hOL",
        "plan_9ACnFYqYr2JOX",
        "plan_LBiIduNEuIpZ4",
        "plan_1LaUz8hvt91zS",
      ],
    },
  },
  {
    name: "Query Plan",
    url: "https://query-plan.onrender.com/services/query-analysis",
    plans: [
      "plan_1Y10FFyL84jXX",
      "plan_R9Ih18wsLK3K2",
      "plan_wKSWBWZjXaP7S",
      "plan_ekQy5trO74Mxh",
      "plan_NyX8j6hIyMC7V",
      "plan_pDrha72TfAvKS",
      "plan_8FXpb58cQQANI",
      "plan_V6z1LjW7dtJAc",
      "plan_MvaAHPr1l04ex",
      "plan_C8EOAyOaCWEUQ",
      "plan_fX9Evz5XDIY01",
      "plan_aMFAe7cl50hGv",
    ],
    ladders: {
      CA: [
        "plan_aYSfFIsK2peda",
        "plan_h2hPotK5OtDzt",
        "plan_pPEGzcAgKAShy",
        "plan_L1GfRlXFoSvIF",
        "plan_mcF0dCo1TqgTp",
        "plan_lthi0lhOERf2U",
        "plan_i97mmCLpQxr41",
        "plan_NFugtf5lFesPG",
        "plan_xjyITqhLHpKro",
        "plan_QlF31szPKBLc3",
        "plan_nihKxctYsrzHa",
        "plan_UCJb4k0D9UBPy",
      ],
      UK: [
        "plan_xPiysf9cehBfh",
        "plan_lAx0s8sqqJ5ge",
        "plan_qtpi2xJyZdSmE",
        "plan_qQ8cLGuxD1071",
        "plan_ZlT6S0gs5s8qb",
        "plan_Xj8z8LLQ04p57",
        "plan_N04DWhjGJriUQ",
        "plan_SJ5coDJmpS810",
        "plan_lHFEbkrbdwyqe",
        "plan_JGB7ZE4WHNtXN",
        "plan_WR9EHfLMor1Ke",
        "plan_RS4Ge74a0r2d6",
      ],
      EU: [
        "plan_zTLjWyBFYYu45",
        "plan_gaVMzpFJnpneG",
        "plan_TEBqzee4rUbXQ",
        "plan_AZRtbRI0F5p0A",
        "plan_JHMoJsXpBb1Nk",
        "plan_FKLqRHZLfjbRJ",
        "plan_ZEaJ7xsBKdiIb",
        "plan_ZKOiTV4hZLI7Q",
        "plan_dbHzNPj8mZB9F",
        "plan_uhhKlGt2jEgzX",
        "plan_VX3ylN1lMlHc0",
        "plan_6MMuDazhQlsEJ",
      ],
    },
  },
  {
    name: "Punch List",
    url: "https://punch-list.onrender.com/services/snag-list-review",
    plans: [
      "plan_pn3TD0sTedcC7",
      "plan_aYFO6WieFe2GG",
      "plan_yAeSkbJcj2aNz",
      "plan_B92P3PRdAGBgG",
      "plan_V4vllAefy08vp",
      "plan_sCKioXrYnAOcV",
      "plan_7ENADULcNLb6h",
      "plan_Gg7THzYfyouYd",
      "plan_AGSNZTpjzCpfB",
      "plan_MQibMyGOrn0ST",
      "plan_t0EHNn54YPwjC",
      "plan_9Bu0MGPuNH08Y",
    ],
    ladders: {
      CA: [
        "plan_1N0zKh9boVzbW",
        "plan_fKY5nEg27VfZ8",
        "plan_M3sf5XOkSZT84",
        "plan_ZwNgYVVGTZER3",
        "plan_LJo1B4NbpV67i",
        "plan_TjDPfoCEsXH9F",
        "plan_08mFXdsviHgDq",
        "plan_yZOQewVAaO9vX",
        "plan_3qsZYQZBk8erL",
        "plan_IAcrkI0I5S4L2",
        "plan_kg6QdFvnRtgcu",
        "plan_ukD20OBUSIGGJ",
      ],
      UK: [
        "plan_KuPLAeZsGoax9",
        "plan_xUc5qFs0jypWq",
        "plan_aYhGFSmcKbOid",
        "plan_JelH9KAlaTZVH",
        "plan_oEpkBFOAGlTYY",
        "plan_gbA5AMSpDDwqj",
        "plan_rwxxB8rreo1nd",
        "plan_5DBnGbrXb0fg9",
        "plan_FqGprRALE4Omb",
        "plan_B214imv0KtpYE",
        "plan_dYTVj971ul6TK",
        "plan_ZnJhGjx0JXPU3",
      ],
      EU: [
        "plan_ETKXxmuIDpItn",
        "plan_kDCuvL2uOK5ze",
        "plan_HGKn8oeLdnSSB",
        "plan_dUr5I18Se9EWY",
        "plan_KIxbQAOGslp62",
        "plan_Av09RWrnhLpij",
        "plan_5uNP83E0owv7I",
        "plan_d01SPPbc4L1Qp",
        "plan_osISlTABAvpUC",
        "plan_fPLW55ZjdfYe1",
        "plan_7iR1bCXGoiY0G",
        "plan_5QW2XIHYmD46e",
      ],
    },
  },
  {
    name: "Lease Read",
    url: "https://lease-read.onrender.com/services/lease-review",
    plans: [
      "plan_EyKCiZTdIPKbx",
      "plan_nPaw1GYttc21T",
      "plan_ecylN1yHuCe1C",
      "plan_G36LUgU62AGaL",
      "plan_ev8gQvJOcWqDW",
      "plan_EYKUMloBD4PZZ",
      "plan_TVcS6D0QksA81",
      "plan_v84tpphqlbas6",
      "plan_i5exQLH6q0r1B",
      "plan_gQTL4Vtx0xjdu",
      "plan_LhCrjVGrfGgue",
      "plan_2SCTkzEIsbW1Q",
    ],
    ladders: {
      CA: [
        "plan_h51rziuywtuZV",
        "plan_lA9CugeUOcbPi",
        "plan_fGOgVtzmfe7eW",
        "plan_JE9mEjA1ee861",
        "plan_RuREWnlpHtuit",
        "plan_sXbtIv1ha902s",
        "plan_rF9UXjNcml2oz",
        "plan_QMmfmW3LUAzIq",
        "plan_EVe1G7pPTxpal",
        "plan_ng2W5Dqk1UhaT",
        "plan_TPSrFhkXV0jcp",
        "plan_gB7EUB1L9QWAC",
      ],
      UK: [
        "plan_xazDyG4aefxOG",
        "plan_bTf75mDQ3VRz6",
        "plan_zA4Fhh6XEVL5V",
        "plan_3rtdWrJlxPXgm",
        "plan_TR9wbcJ2xPuzf",
        "plan_hvXe3c7U5LhiN",
        "plan_uEROYzNeVFj4G",
        "plan_G2F3HFGOsZPBi",
        "plan_TVaKyjhPeFX7J",
        "plan_EDzSegMpl68az",
        "plan_vS34mUfnBCWxS",
        "plan_oEmoe2JStxGn4",
      ],
      EU: [
        "plan_Xm4CsC2kwHXbx",
        "plan_h78NsBvMnkHMw",
        "plan_knxmpEyxIYYR4",
        "plan_9PVnwdFsNtKbm",
        "plan_ujquoV0xCNzxu",
        "plan_r2kgwu2QO93XO",
        "plan_zehGeLu3kt072",
        "plan_QhDmLLqPFchlg",
        "plan_HgwlWV6BFbPRA",
        "plan_j0u6UaXHMK2k0",
        "plan_l11mDaJHVBdF0",
        "plan_onegxzHlQItdA",
      ],
    },
  },
  {
    name: "Spec Sheet",
    url: "https://spec-sheet.onrender.com/services/datasheet-audit",
    plans: [
      "plan_Qo5nwZTn88cZ4",
      "plan_mYpnF3Mgq6Z5e",
      "plan_oOlRE1VsHCLoj",
      "plan_ZQfbrMxfbHHXJ",
      "plan_d0Jqujb3riKtR",
      "plan_Hizj37cvjcb7N",
      "plan_24ypEvUVWI7Vh",
      "plan_jESf7qtjWQmTu",
      "plan_50GbWdnz0RqlW",
      "plan_NveuEmQ0J3qv4",
      "plan_ZgmByOFCy2E8J",
      "plan_QjinJ9Gq5Xmoi",
    ],
    ladders: {
      CA: [
        "plan_uwddSP1w6VYmm",
        "plan_e0YLnogoXI4Zg",
        "plan_amX2z5PZttY6b",
        "plan_icVQa9m5xczYa",
        "plan_ZyqNWEZ7DyYjA",
        "plan_qB3ndDutepitz",
        "plan_Mf5bdvFJL2yKj",
        "plan_79RcBIFH4j3jv",
        "plan_m4TLA4dpM3Mwx",
        "plan_PgeH1bxJIsXOs",
        "plan_sbewvPXyp32cg",
        "plan_d3XFgrrHJosde",
      ],
      UK: [
        "plan_oXlPNCZ4t1jLh",
        "plan_VRX1T5W7gZwZW",
        "plan_LFAG7baYY0MDw",
        "plan_okFjN1pdRypXn",
        "plan_CNhF9aybYWvP0",
        "plan_5mwuC9S5M7SaV",
        "plan_gs5c2h5mYEX9V",
        "plan_cbYE8MBEk7W5R",
        "plan_VXBhcOmoPu0r4",
        "plan_3QZKEEmUCsStT",
        "plan_3x3XyS802aq2X",
        "plan_c44Mef2RbeyEQ",
      ],
      EU: [
        "plan_DRgHYrlhbdCmE",
        "plan_dRdIRtPeZtbqb",
        "plan_sQOUdR0RMYyoW",
        "plan_35ZVZaQzVqbqn",
        "plan_AyTzcOtrMvnwS",
        "plan_YnSN3RENqDkg7",
        "plan_nyVZpapyfGxhY",
        "plan_OuI2me189izRd",
        "plan_V1ImmTnmtkgTz",
        "plan_0C48mb2bX2egA",
        "plan_KHhcjIvyLAGVQ",
        "plan_F1iGA4wAM6Mbk",
      ],
    },
  },
  {
    name: "Rate Card",
    url: "https://rate-card-qaos.onrender.com/services/pricing-review",
    plans: [
      "plan_WZmvcMxU6EJp9",
      "plan_OEjqYfnsdiyJU",
      "plan_Hk2ngI322J7FS",
      "plan_cDmsQAxJsfLjc",
      "plan_uXjQjnIl09yxA",
      "plan_vAAXq5eHv5y01",
      "plan_TdDDomS49tWEQ",
      "plan_oDYjadVZ4rmFJ",
      "plan_WoleFItFQKoy9",
      "plan_Z42IJHFPdaKTL",
      "plan_reWH5h43A6jNg",
      "plan_oW7e6IHXbgviK",
    ],
    ladders: {
      CA: [
        "plan_h1hT8N7ucClcU",
        "plan_FPRdX3LoFU5Fa",
        "plan_GYytJT9fGuFXv",
        "plan_vMAd2nvKxmB55",
        "plan_QLsZ1qfA61Uiz",
        "plan_lpOq8chHdxoEC",
        "plan_WuoXvsGvfYwbu",
        "plan_8AnlwgTqEJiVc",
        "plan_MWp6TCAfU7jib",
        "plan_Z5cV1NFgoY9Lu",
        "plan_2G0IrBSdhw3rd",
        "plan_qsENR7e8tfPXD",
      ],
      UK: [
        "plan_EANrsZwmnWnIg",
        "plan_uisfcbRgnEdKp",
        "plan_VdKzHLqMWpSmT",
        "plan_NvM9qRADHyqtJ",
        "plan_5BkHSwIjn7F8S",
        "plan_nNSyeYCrrVLdw",
        "plan_HhEgSaxBDCHcf",
        "plan_Yk69NcJ7DpY5m",
        "plan_ncQFREoF5I2ko",
        "plan_s0DraYsXdmlO4",
        "plan_TKVbn1YYKo853",
        "plan_2m0q5m8WmzGfq",
      ],
      EU: [
        "plan_ArME057qVOXoc",
        "plan_W7DyIL9NLwW92",
        "plan_FcQuI0CihyeZo",
        "plan_Nj19UQIQhvne4",
        "plan_GIlnfTB8jWomD",
        "plan_Qxy2ohgH6f0Qg",
        "plan_tRqrkvvO53FND",
        "plan_sTSL974NKBYa0",
        "plan_dvbUUgLSraShh",
        "plan_A7UVTEnnt8pEr",
        "plan_RAM1qkCgztLDE",
        "plan_ucXQKfN105cu7",
      ],
    },
  },
  /* NOT A NEW SITE. The Bindery predates this script and is already in the
     rotation with the USD ladder below; the other three markets are new.
     Its URL here is the onrender host, used ONLY if no existing row is
     found — the USD plan ids are what actually identify it, and if it is
     recorded under thebindery.com that name and URL are left alone.

     The product is Query Letter Review, priced per page. The site also
     sells Manuscript Audit at $149.99 a round off a separate six-rung
     ladder; that one is not sold through the rotation and is not here. */
  {
    name: "The Bindery",
    url: "https://the-bindery.onrender.com/services/query-letter-review",
    plans: [
      "plan_MFfmV6GdDxaCp",
      "plan_vGirK5vU3xxqv",
      "plan_GPLMCPBGNOstg",
      "plan_Qs508ndvK7ZHx",
      "plan_YHEgdxovcxL2l",
      "plan_owU2v2rj9lmE1",
      "plan_Nmv42IVnmZSZS",
      "plan_Td7Cib8T0op3V",
      "plan_gGvM6QtmoFfsk",
      "plan_6wh36SOq2Sh3u",
      "plan_bIkZgsYGYlp6A",
      "plan_7yXLkOaoQJH1G",
    ],
    ladders: {
      CA: [
        "plan_1VlydYZWYD7lC",
        "plan_1LoKZ5CgyNLAR",
        "plan_W3eHXGQpJoPdb",
        "plan_UAru0qt4gADDL",
        "plan_j2MxIMDiLeS6L",
        "plan_nH3idro2DUZW3",
        "plan_ELxVDhQZoMeUN",
        "plan_oPSHUQ7cyCiq3",
        "plan_U2UNnuU2LazCH",
        "plan_3ZBw7SxeGePuS",
        "plan_us60M3PrvFWlS",
        "plan_jEOe7nTZD4MGC",
      ],
      UK: [
        "plan_uUksKvAdMnh9j",
        "plan_QMzYFct277Uyz",
        "plan_8k3ONpkTQdTUh",
        "plan_3ItFqm0yVlVte",
        "plan_FVtOxDfBoUKfZ",
        "plan_hSNistBWCMI81",
        "plan_mOxBtXHaotQKC",
        "plan_aKVZnwaa0SLxe",
        "plan_YloGpFL3Zm4mG",
        "plan_XMQQwwKz5S3Px",
        "plan_UGC7L8ytGF55C",
        "plan_sFCA6TLsbGqzI",
      ],
      EU: [
        "plan_JZZTU5PDJWIBq",
        "plan_nEYzJm7Fmr8XH",
        "plan_dPwvBEplEd6re",
        "plan_EheTGS71isVk7",
        "plan_2BVJg4hAa78PF",
        "plan_IJ5RAteW5oXbe",
        "plan_WQ4zpPGMm0oka",
        "plan_xb6aG1djTayla",
        "plan_WonWiILRW01BW",
        "plan_1KDaWGxSImDeM",
        "plan_aWWCdBE49JakL",
        "plan_eF48QeU6nlynu",
      ],
    },
  },
  /* ALSO NOT A NEW SITE. One ladder serves two per-unit services here —
     Chapter Review by the chapter and Methods & Data Audit by the study,
     both $74.99 a unit — so these twelve rungs cover both, and Defense
     Preparation reuses rung 12 rather than carrying a thirteenth plan at
     the same price. The three new currencies inherit that arrangement
     unchanged: rung 12 is CA$1319.88, £719.88 and €839.88. */
  {
    name: "Defense Date",
    url: "https://defense-date.onrender.com/services/chapter-review",
    plans: [
      "plan_LpRAETFmCa6aG",
      "plan_BKwhp1GTNH14v",
      "plan_zFph2BWTL8mb7",
      "plan_DtjH0qchh0qGA",
      "plan_RXMf1S4xoy45j",
      "plan_fTlsTS5zffUTF",
      "plan_X6AnoW1Oj4mfY",
      "plan_TLWjmP9sqPkoo",
      "plan_YCpA79A4ZpuUr",
      "plan_mP9brKv42B23c",
      "plan_VW6ol3vOshvtZ",
      "plan_MzePqxB14apAC",
    ],
    ladders: {
      CA: [
        "plan_dkdc513ls8nXU",
        "plan_3fFXXEUhO1iMU",
        "plan_aNSbH4JpK1qbJ",
        "plan_ArJrZYVhClG12",
        "plan_MAxlpuXXonhdp",
        "plan_kwTHcsuGFj3TW",
        "plan_HeOGOI0TZL3Zz",
        "plan_JgWw3VRhUCDou",
        "plan_noPUGls3sz2yt",
        "plan_PsDAOiD68wkok",
        "plan_uiIlUBzLOXoRY",
        "plan_OsfupNy1dzBkL",
      ],
      UK: [
        "plan_ECayMuUOAqCrC",
        "plan_NQsFOtS0YgMK6",
        "plan_KJhDW5UKC2VdZ",
        "plan_dLiXCw6iM1IBB",
        "plan_9c1OtsHiyhEA7",
        "plan_XckOGAGmnminC",
        "plan_izrRKVASThoHe",
        "plan_hiu8yLuaqJm1G",
        "plan_cMR1n2F7pOeT8",
        "plan_heUuSZgaZd8PJ",
        "plan_wS0FNHHogk41N",
        "plan_YNmEUHP43gxQQ",
      ],
      EU: [
        "plan_uP9shKajQPXjq",
        "plan_2tw9CBawwRCfn",
        "plan_h7qRUl9LVOEuH",
        "plan_hwYHyf4xd8ec1",
        "plan_QEzVBd1J2xVTR",
        "plan_jOxYlc12v76lu",
        "plan_SsZKMWtYUIJPA",
        "plan_a9P6ZvPHEDlto",
        "plan_2cPtSMj8JbGza",
        "plan_biSI4nK6TIbFQ",
        "plan_XByLeb5OqDjXV",
        "plan_5Xjeb6sYSQo4i",
      ],
    },
  },
  {
    name: "Risk Register",
    url: "https://risk-register-7rjp.onrender.com/services/risk-register-review",
    plans: [
      "plan_5EZvByRbSsPr0",
      "plan_muP45XweTepMb",
      "plan_Nw2qKT7KFIYMp",
      "plan_RZnkky1AQRagG",
      "plan_m8GsOo1IpHCQO",
      "plan_nQ1soQyntrfCY",
      "plan_aB9CsmG6yOxkx",
      "plan_kyGx8tg98WAsu",
      "plan_jzkLu2vMBbAIV",
      "plan_OF73cHlxKFGpX",
      "plan_kgbPgP4jXPDTF",
      "plan_mpF4rt1dbhvYi",
    ],
    ladders: {
      CA: [
        "plan_praXobcpD9Heh",
        "plan_vT6sTp93mhrFm",
        "plan_97QKSHP5QJ3Jf",
        "plan_tyPYfrIetDfPK",
        "plan_5jfRhWXuafWMx",
        "plan_E9Oy7LfSQhW0A",
        "plan_FnYPP4nirUJZz",
        "plan_D5NMT1j8DXSCD",
        "plan_BfW7IxK0rA9Ar",
        "plan_m72mZ2VBOhtCW",
        "plan_4vT79E3PfdBLy",
        "plan_Ty8NpmzcGcQbD",
      ],
      UK: [
        "plan_pyv5G1ZQYlCIt",
        "plan_pKqYSpLShSSLO",
        "plan_BiLmgHgGa5Vif",
        "plan_f7mQ3Bgmb4EkI",
        "plan_xxdQudRCRtpoU",
        "plan_TjHrz3hpRGX9V",
        "plan_DJYlga6NcfHL2",
        "plan_6adxW5YsyeHAl",
        "plan_H59hC5ltdfds2",
        "plan_9M9tK2TyHGQAH",
        "plan_zqQpoIBv5VhNk",
        "plan_GaWNYlexraj1q",
      ],
      EU: [
        "plan_NXVvoLeASRinD",
        "plan_a3w1zKHuvvH4W",
        "plan_ajnGdHElT1xJT",
        "plan_Qw72aapFLMzhF",
        "plan_0awmIOeiclgeD",
        "plan_jHDXoMV9JxnZi",
        "plan_CXKcNBD3adnNg",
        "plan_J1680P4bBpnZ3",
        "plan_lTWnNmS4KmTr7",
        "plan_6Riqe4KepIZUy",
        "plan_ZhKE3kNVBl23X",
        "plan_N1ye30nelYXXC",
      ],
    },
  },
  {
    name: "Tender File",
    url: "https://tender-file.onrender.com/services/tender-file-review",
    plans: [
      "plan_qm30HHu7VFB3H",
      "plan_2RV7qIEoyojWS",
      "plan_WKUYYQYgiCSiW",
      "plan_p9dGiS9tTdzi9",
      "plan_eoQ4Vj2YMSLfE",
      "plan_F01SLps4BgVPH",
      "plan_f4JFeQzZ3i9g8",
      "plan_XMlpDSgM8EHmJ",
      "plan_2Es6GA2S4wF1f",
      "plan_KgngS5xvUSnrm",
      "plan_Z2X3LFlXrNJSP",
      "plan_68UWW4KHXL7Ss",
    ],
    ladders: {
      CA: [
        "plan_inhR69eGgwb3H",
        "plan_KzjkwAdhRsSmf",
        "plan_uBAGrLd0jVGlY",
        "plan_c6WmDR2j8XKZi",
        "plan_37pYOUHV5Bmb2",
        "plan_PyvlapRicW5Ch",
        "plan_nrrGUeS6E5o62",
        "plan_yEcfwghFePUYU",
        "plan_vNOaX48IlCQcD",
        "plan_nJRhoGEq71JzP",
        "plan_mroGmEQn5tdq3",
        "plan_oxgwXVRwFd9Yq",
      ],
      UK: [
        "plan_YGmiygGBUa1RB",
        "plan_u8O32yxXqkkuS",
        "plan_zkCoHwf2zJxoz",
        "plan_U8mCGl9NfMFDM",
        "plan_dZbWzqQk6dWoa",
        "plan_LWHxYFl7HVMQb",
        "plan_d19XYjGkzoA3T",
        "plan_qgqeAWEBUCAkV",
        "plan_ZuK9JVTgxxsJQ",
        "plan_oODXiRATkUuSA",
        "plan_aXzHDGjWzRrNv",
        "plan_tUq9hFZwHfApi",
      ],
      EU: [
        "plan_bduVYas0Z0Wbd",
        "plan_N7XeDJqbXxDYF",
        "plan_FQzZohfY6YNWN",
        "plan_Gr4imJLWLszjs",
        "plan_Wvvirjz1NVDq2",
        "plan_M5A6GficATZFT",
        "plan_kjCEJ0KyAtJQz",
        "plan_dGOCdyG1w6ZPH",
        "plan_0mzLw2N3mVYU6",
        "plan_7F8d1m6OkXezQ",
        "plan_hy9KSmrQ5miO9",
        "plan_k5JfUapt2UYin",
      ],
    },
  },
  {
    name: "Incident Report",
    url: "https://incident-report-1tpe.onrender.com/services/incident-report-review",
    plans: [
      "plan_NlBiSlPPUcQRp",
      "plan_xcbVs16SnRRUr",
      "plan_gihcOuGBtY5Kz",
      "plan_Mgz7hWtMRtkvJ",
      "plan_PDoWz04nJmLVZ",
      "plan_Dlvrt08TH7om3",
      "plan_hGiC7Q94ZMC4c",
      "plan_US9W3Zkt4GiGA",
      "plan_XYdVhi2KgbPev",
      "plan_ruc4hlY1XmePj",
      "plan_hjS2TwXrEdd13",
      "plan_hHQwhVFeIuzYC",
    ],
    ladders: {
      CA: [
        "plan_Slr5Dd5dgYUxO",
        "plan_KyC97Y9IKbKKr",
        "plan_7NmalFCNz6cZe",
        "plan_wRyU2H823JVgM",
        "plan_GmqRKGs1Xe0ds",
        "plan_cW6cxzyapF0OY",
        "plan_KE32bjb0UrZc5",
        "plan_1y9UjVHK31OXR",
        "plan_yk415Q80NELMQ",
        "plan_gCYGYchXTOX80",
        "plan_FSUyRSjJUVyK6",
        "plan_OBk1QAw4k4s8a",
      ],
      UK: [
        "plan_PyPeFlHOI9Ccs",
        "plan_T60VYeb6vUNvO",
        "plan_WGlv1AslMYz62",
        "plan_J1O9C8koWb5ar",
        "plan_6iUHMNtsCh7a5",
        "plan_7tewS5mVFiNMy",
        "plan_s5GXa1HBec7Dr",
        "plan_oGjL2PNTHwROr",
        "plan_X0M6idLQLyMuC",
        "plan_PjqfnNOakd4wS",
        "plan_hUk8V0R6Eme7a",
        "plan_EtfNl4SbLVGjl",
      ],
      EU: [
        "plan_3XM1N3uPKO2db",
        "plan_MA6yAroB3sBbF",
        "plan_gINS8siJVWzmD",
        "plan_1WcGi35aSjdpI",
        "plan_L66Uy2A5esV68",
        "plan_NdahXhU2jY1x2",
        "plan_wYweJ6SFnuqsd",
        "plan_4fX50PJ6P0qQ1",
        "plan_D5wT1qR3xt6Hy",
        "plan_uWTJVjjNnLwLi",
        "plan_PncoQuGGdp0Id",
        "plan_Q6y6RJouXClYf",
      ],
    },
  },
  {
    name: "SLA Sheet",
    url: "https://sla-sheet.onrender.com/services/sla-sheet-review",
    plans: [
      "plan_5l4lzynDktocS",
      "plan_4nxgSq0ggzfl3",
      "plan_BE6WxPbEzMxzK",
      "plan_nweStLADpG5rk",
      "plan_w3ePLLYX0FsMP",
      "plan_knRHGrKUZ3WtR",
      "plan_8NwvGAlzhTIAR",
      "plan_UyXkiY6iGeyOq",
      "plan_yaQIqxcGIADvz",
      "plan_ULNqdP06eRbbe",
      "plan_n99hB56aFmqLh",
      "plan_zQSgNDWFtNVmb",
    ],
    ladders: {
      CA: [
        "plan_aC7FrlC0zRQMm",
        "plan_oXzMvkZ1it35I",
        "plan_bXEMoZZ1Tm6Ws",
        "plan_krO6WvDAEeTZY",
        "plan_SXlY3HZWRTr6j",
        "plan_z5mxoU71y816o",
        "plan_t0xvk7l26AATF",
        "plan_ieTHgLkZFptTh",
        "plan_gC6wKYmxCkOVA",
        "plan_vnYE9bG9gfr3w",
        "plan_Vj1hVErsq8o87",
        "plan_TJMymnxZtMMVk",
      ],
      UK: [
        "plan_hKUx6eVYYpwP4",
        "plan_Li8OaHHwbYCrY",
        "plan_ygeijrMDzdTKM",
        "plan_9MNiArsGfBeqW",
        "plan_NpeccJIEUd42L",
        "plan_sTh6QhttMj3Ag",
        "plan_8NltlchNeBdeJ",
        "plan_WknUkkJl3mUBt",
        "plan_0cn4Ep0vCeoRk",
        "plan_NpmgJqMrbmXxw",
        "plan_C9ImJIVcX6ff8",
        "plan_LRI5uEwrX683m",
      ],
      EU: [
        "plan_G19PlU0sawaOT",
        "plan_AmfnNiOfJ1Q5E",
        "plan_MjgAqawxLuptd",
        "plan_novyHzdaZvoqn",
        "plan_k5lwmfNEHNDyJ",
        "plan_fx3HDtKk2V9ny",
        "plan_LOUHUCBML5BlI",
        "plan_pfsW7MqCsTEQe",
        "plan_eLnKyI9QJ8maO",
        "plan_2pt24beLuqN0X",
        "plan_OBwbSZnnmBZ7Z",
        "plan_ekgwlPfgPjYSV",
      ],
    },
  },
  {
    name: "Press Release",
    url: "https://press-release-00lb.onrender.com/services/press-release-review",
    plans: [
      "plan_YJNVqrudiFNFA",
      "plan_u6xyN10rvE0XN",
      "plan_XsW3rjmT1pSeH",
      "plan_ry7k6ZbZY61xE",
      "plan_fMcFRcpYQOaYw",
      "plan_XdTKuyshtpRl6",
      "plan_63on1RJ1pHLgO",
      "plan_drfDBq7CrOFKI",
      "plan_uGuoLO7HJO69r",
      "plan_joEOjS1GTdYM7",
      "plan_YRdj5BPOjDh5N",
      "plan_uecmhhLLtiONm",
    ],
    ladders: {
      CA: [
        "plan_oUZ46kzYiw4Mr",
        "plan_NKRpVIcagxFW4",
        "plan_JmUO4FXwm0IQ2",
        "plan_TkaFr71Q3IYL9",
        "plan_qRo0qXqBXgQob",
        "plan_YLFNNY35M9RSN",
        "plan_M6kUP6kieprWY",
        "plan_IfL5Npu1PunAX",
        "plan_SbQ0V6xc4WPlx",
        "plan_NiDryZpi8k82F",
        "plan_MyhJdHSFsfBEK",
        "plan_uzCsOhptICgeC",
      ],
      UK: [
        "plan_vIXxxWC8D3eVJ",
        "plan_HI02mmrLukeHT",
        "plan_HVYerYnsySQ0t",
        "plan_P34hZLgcXC31C",
        "plan_zLD6LcegwafaZ",
        "plan_svw5z5AUU3Olt",
        "plan_32uv1gmRkAsEu",
        "plan_6K3mt5QBYrr4M",
        "plan_E77G4a9ctuTxl",
        "plan_qFPNqadWOhMgN",
        "plan_zQoHsUwJwwgld",
        "plan_OfFE56Xf3FFRa",
      ],
      EU: [
        "plan_gNkUCp3h6JIaB",
        "plan_O5564QHMuUVJs",
        "plan_4ug85TMLinKBw",
        "plan_96BmLJXnkEcVA",
        "plan_TTiyspyDmJnvf",
        "plan_JB6yV1ZbMZKf0",
        "plan_fvKFkbJCiKUMt",
        "plan_WAkWxmxRvWDuR",
        "plan_Z1HpsUjeqUdoZ",
        "plan_XaVt3Xi1mXsMf",
        "plan_rdU0yqW2UFHOh",
        "plan_DxO6oKqIZR9cN",
      ],
    },
  },
  {
    name: "Policy Doc",
    url: "https://policy-doc.onrender.com/services/policy-doc-review",
    plans: [
      "plan_jnhHj30kMSRru",
      "plan_djNRIsyVL2GnX",
      "plan_VQWJ9zgB7Zlsv",
      "plan_pRHf9J06xQiKa",
      "plan_NxWITrpcJFohD",
      "plan_YvlDfpLAC8Iie",
      "plan_eSwr6S0t166Hd",
      "plan_ZbKaFBtCx7glC",
      "plan_ADySoSmRNrGBa",
      "plan_xzxnzy3FO9oQZ",
      "plan_LUxPpWrqbj95Z",
      "plan_siKdpvSbkW220",
    ],
    ladders: {
      CA: [
        "plan_gqCLeBNtnWv78",
        "plan_0Be0ok0EmYnPV",
        "plan_6qlAmbkULbaMQ",
        "plan_SgJREXLmxXb95",
        "plan_1owQelzTvdrkh",
        "plan_LciWKonbvhs8X",
        "plan_FbH8Kygzmv5rl",
        "plan_Jl4brJWr5j9ic",
        "plan_7S7UWa1AcKuEe",
        "plan_cbkgxgTwSb4NO",
        "plan_RENGI02FYEXOb",
        "plan_0NmaHGE0XWOi8",
      ],
      UK: [
        "plan_99ZT4JVftY94N",
        "plan_O7wirUi5htoCT",
        "plan_WY6jqCnJw3ksn",
        "plan_35R2CRHHg0Ts1",
        "plan_wNRQHfX0lW75H",
        "plan_0i6uEQ51TYiSB",
        "plan_NLgJmejjF00Wt",
        "plan_sESmmblqhHGau",
        "plan_tKD63NSnerliZ",
        "plan_wC0a0sieepsB5",
        "plan_ndcTJNgFIPMZE",
        "plan_KU0fd1bRtgHp8",
      ],
      EU: [
        "plan_Ko3hudi5EV8q1",
        "plan_S1EORzTpcOBu1",
        "plan_ctVG2Y5WdtJsu",
        "plan_BNmJuhPv05eBc",
        "plan_3cDdo7KFvtY4I",
        "plan_LqRLfhNuEbqND",
        "plan_fe7zpgzM3KKxq",
        "plan_KVryifZNpW57R",
        "plan_s6daKS3LwddRu",
        "plan_4g9jTXlBLhWAC",
        "plan_uPHGq1A1fFCy0",
        "plan_dThnU3Kegtthd",
      ],
    },
  },
  {
    name: "Shift Rota",
    url: "https://shift-rota.onrender.com/services/shift-rota-review",
    plans: [
      "plan_jBkf7pywt4gxG",
      "plan_ekeEhKzQsl1Su",
      "plan_YvulOB8sw6c6o",
      "plan_EUgYwVeXD0n2j",
      "plan_bOqO3WBNGH31b",
      "plan_uQrjyTKgukRfj",
      "plan_TubYP0IVmmwpz",
      "plan_AWg7sUGPTa2m6",
      "plan_is81KZ5xl3bMs",
      "plan_pwAFjTtJuMhu5",
      "plan_WghYRgEnN6VjY",
      "plan_OXHd6TcmF52q9",
    ],
    ladders: {
      CA: [
        "plan_8eTrTVvxtxG41",
        "plan_h92zUhQdC3R5x",
        "plan_R5q27B74VeaKU",
        "plan_bMqFjtrmTWYs9",
        "plan_V81UoivNdkvdA",
        "plan_Z6O5opS0gje7s",
        "plan_9tFQgjxoeu1mD",
        "plan_8QMrRkue0Q47Q",
        "plan_9itCXEnARvAja",
        "plan_6Czm1Z89qHhyU",
        "plan_JUDeeEMpp1ulY",
        "plan_5Grjx8K7ozelK",
      ],
      UK: [
        "plan_xd46O58ueuc3F",
        "plan_pnW4X6oTYFrEq",
        "plan_6jmgLSf2FwmgT",
        "plan_vMHa0LvKjiJTQ",
        "plan_i5sVHTSOahP87",
        "plan_7k4bQuWxjHwrv",
        "plan_KxoFwTo8MMiqJ",
        "plan_45EaBCDE0tmm2",
        "plan_GKAuNlqFeUNfe",
        "plan_gidiJbOoUDvSz",
        "plan_s4zENRs2fGecV",
        "plan_WqfyvpI7gdggI",
      ],
      EU: [
        "plan_XzXtHuUmBlW2x",
        "plan_gj7vxKjsloVEf",
        "plan_hP0jXMnxCrBYf",
        "plan_OYoHBIqbG6qFx",
        "plan_oFQy4lkQQ5x65",
        "plan_mRCfNFPxdyh6f",
        "plan_soyIfDvTWzZR2",
        "plan_GgB8HkxpjnmsK",
        "plan_rJQBPoWxpx0ge",
        "plan_7I4FvQ7cvUQz5",
        "plan_ZPt49qmk8l69F",
        "plan_zuULZM4bwsyvp",
      ],
    },
  },
  {
    name: "Survey Form",
    url: "https://survey-form-0hov.onrender.com/services/survey-form-review",
    plans: [
      "plan_JHNhbAyZ2t5it",
      "plan_7D6pp0o8J9fQl",
      "plan_Q4NAxQMbo9bIR",
      "plan_RpdRSrBRwSyzk",
      "plan_Xu78Q0LxziJnU",
      "plan_UPkceLjTZTuHF",
      "plan_jjBeCtioMf8qm",
      "plan_YQNiUNP9rtnY4",
      "plan_ALCASMfsC2oLy",
      "plan_PMxlnNVqzSjDI",
      "plan_u87V1aV1HO54T",
      "plan_Xflq13mzmCYuT",
    ],
    ladders: {
      CA: [
        "plan_YrDnjlluh9dwy",
        "plan_qzEfRuXtVysrO",
        "plan_JLURZlYabQ4RX",
        "plan_6Zqpi7HOyDRlk",
        "plan_UAsJNowdLQ0IH",
        "plan_lX8xjJ4SQHQ8g",
        "plan_OunRsGSXlZEX9",
        "plan_bsXr6K4R2S9hG",
        "plan_JTmdJjh5CSf7Q",
        "plan_kAAJDxFgUrCRa",
        "plan_WIHVO2y9sHUoY",
        "plan_Fxstc5rLNoVGK",
      ],
      UK: [
        "plan_m2qPvQJ6jPsqA",
        "plan_fj1Bxv77e82xi",
        "plan_gsD8ofr3BEwEi",
        "plan_BqhVTuXie0sCH",
        "plan_VbiGXes14UhZR",
        "plan_Rkgj6DArmvw7Q",
        "plan_EWxAwNDMKwoMQ",
        "plan_TvlLxvQq67Sgs",
        "plan_cfhEEdXw99amR",
        "plan_76jWCSnfNoUC6",
        "plan_fA5lT416yH4c3",
        "plan_eEFinqQyaxN7j",
      ],
      EU: [
        "plan_fsvUjIbsdKT0t",
        "plan_ZFdkkGnZQ2n4G",
        "plan_NwvSFbr8PHaNb",
        "plan_6H2iMyTwnr3Oh",
        "plan_nELaTNoYE6FsR",
        "plan_9Zt8j54Rym49u",
        "plan_yagTDIkv2oJGK",
        "plan_IIZd8YcaToCnj",
        "plan_BJPY1Y6ZPZ7PG",
        "plan_ZyRYOY80I0FvV",
        "plan_tRz0oD0IBbLve",
        "plan_MA6gvfg7UR8m1",
      ],
    },
  },
  {
    name: "Change Request",
    url: "https://change-request-jlxg.onrender.com/services/change-request-review",
    plans: [
      "plan_GjMkRYj7l6Q5V",
      "plan_EBloFge00Fg8y",
      "plan_Zh12BT8mGSI9t",
      "plan_AeZ64OCPE1uZg",
      "plan_JeqLjgFjYIBMR",
      "plan_0SNRpP8UelHDz",
      "plan_4suCp65rofk85",
      "plan_Fs2xMclC4ZKqe",
      "plan_6D6fah3SNWnPT",
      "plan_bclPMpoiosu5z",
      "plan_KcXBkUeeFR4US",
      "plan_qF8mzZbjizyVR",
    ],
    ladders: {
      CA: [
        "plan_7OuyFP6CocpJb",
        "plan_o2Mo6Hzkc3mSh",
        "plan_fFiG3bpQ59eGL",
        "plan_WldLJemTziHfW",
        "plan_b36baC3KFiizx",
        "plan_nk5Dlbm2TQ5p3",
        "plan_lzxKRkJFXAZwH",
        "plan_vaHiWB5zNsG97",
        "plan_68NCjD6VZR0CJ",
        "plan_6NlEKlWoYXqvY",
        "plan_0z10CuA9aycoJ",
        "plan_LXYERwaox0INg",
      ],
      UK: [
        "plan_0XOvud8CizFRt",
        "plan_hT7JZ2E0JFYAy",
        "plan_NOph3pBNvL6uA",
        "plan_WL2xwgEwsJGx4",
        "plan_ZnkyhAnSA0CC0",
        "plan_BGvWN6qZgQobL",
        "plan_dWIGFIz7f28NW",
        "plan_dZ6bo74MsZsIV",
        "plan_0ZE9TXdxVxoWw",
        "plan_3aIobsGX5kSgE",
        "plan_SX8HdX28SVeYl",
        "plan_enjPg4fFXwt8z",
      ],
      EU: [
        "plan_w5qxd8aRLR9F1",
        "plan_Q5Gf8yXXlgx7h",
        "plan_ApfaagEssDkaD",
        "plan_UMLwkckSC86iN",
        "plan_SSyYXr7JRUk2x",
        "plan_QVlMv90eZYQ4d",
        "plan_YKAC7ciJF3hnh",
        "plan_Johhqnj5zlFbp",
        "plan_Oi7IuFJWEMePF",
        "plan_0v6DEQ4RH050F",
        "plan_QMLednSBXHKej",
        "plan_Ulg5BGqfURl5d",
      ],
    },
  },
  {
    name: "BOM Sheet",
    url: "https://bom-sheet.onrender.com/services/bom-sheet-review",
    plans: [
      "plan_ZHEF9znOrWG9J",
      "plan_qLvrQSaklzlCc",
      "plan_W8zZYW0dIZIPO",
      "plan_890vwoqJyyMuL",
      "plan_EzwM4BwFQntoK",
      "plan_6Kv3sMtODDpNA",
      "plan_KJjDa26dpkq51",
      "plan_vpXJewXCQeEww",
      "plan_uRhj7o1yltsZg",
      "plan_7gZ4aar8EsQdN",
      "plan_wlsRoezaglWd2",
      "plan_JhLKTIBssc9dj",
    ],
    ladders: {
      CA: [
        "plan_xw7ZWGcwTnEFs",
        "plan_gz15yG9olsxtF",
        "plan_MbnLc8exsrxtm",
        "plan_08rr3sMQ7X7sV",
        "plan_k6CxEKw98vSFe",
        "plan_8SGMhpYCgpGiq",
        "plan_0IVqLPQZxSAYS",
        "plan_FJhBgNuGvA6GW",
        "plan_qecOVnYuDbjqL",
        "plan_DITRTbuF8C7F0",
        "plan_465tcmQYh9dBH",
        "plan_TT0XdVKh78RCN",
      ],
      UK: [
        "plan_JbdQkEW1a1Z2w",
        "plan_LoPYN5HWKoLGt",
        "plan_q1FE6tSanL2TC",
        "plan_6WblqPy5RMdob",
        "plan_SpTuhmxoXI0vM",
        "plan_wNubE5uwVDqss",
        "plan_kVpIg7CBmMSm5",
        "plan_Z1L3U7DBUnP8W",
        "plan_I6c2TjVTDVFBh",
        "plan_eeUXyOUp38G6m",
        "plan_4fF1vYSHVYFHD",
        "plan_dHwuJjPO03UcO",
      ],
      EU: [
        "plan_MMWAHLNkORwnK",
        "plan_G4VjV2SfCTtYc",
        "plan_oBu82yv9JEDCm",
        "plan_3E1ljUXx3fUs9",
        "plan_xS98jRF6bOVZM",
        "plan_0BcNIs56VYwqH",
        "plan_5GOyybTNxxVPr",
        "plan_NowZbkZ4HnM9j",
        "plan_2okeJNtkdfAOB",
        "plan_2azmjk44sVsoj",
        "plan_Ijq7jooyk4nqp",
        "plan_XxbIQIw3DRX0m",
      ],
    },
  },
  {
    name: "Scope of Work",
    url: "https://scope-of-work.onrender.com/services/scope-of-work-review",
    plans: [
      "plan_iuI5wJPliuzFz",
      "plan_H3JFPTTiTluPK",
      "plan_NEfXHqfZQG9VK",
      "plan_AH0BisBUH55sS",
      "plan_S18TlMtPuVNN9",
      "plan_CMT0sQEYDO5UV",
      "plan_221OAaQanA1sx",
      "plan_suN9WrWjfGoeQ",
      "plan_tkfvbuvRAxxlH",
      "plan_h5uTPLfKIz4Ck",
      "plan_0QF12CLaW9IgB",
      "plan_yh2asXtN61hVs",
    ],
    ladders: {
      CA: [
        "plan_QVIftqtgHhdCC",
        "plan_zBxsIW0P80IIs",
        "plan_OZqjBySPr1N4G",
        "plan_CJsQzFoD4WoGL",
        "plan_VJnt3skeEDeOp",
        "plan_lWzwbsHzCFNkz",
        "plan_R57fK36bdBFk4",
        "plan_MNSNrXZdYmDM4",
        "plan_9yXYTB3YJtxR4",
        "plan_wYWnTNhy3QjkF",
        "plan_NwxVXHwlSNRtr",
        "plan_mAvcG2MNAvF3M",
      ],
      UK: [
        "plan_hfmwcIIOEaXlN",
        "plan_J9BWo8Ts80rRq",
        "plan_sqhzpRJ6z7Cy7",
        "plan_Ok1LBvEvnwfTI",
        "plan_nPr8resQ0HL0l",
        "plan_WSDjcnYdthQgg",
        "plan_ni0oquTMcHAVg",
        "plan_VjM7mfYXN227a",
        "plan_vy6HUfbDeGseP",
        "plan_ntKOWidG3TlBd",
        "plan_AN03kVqlfzetO",
        "plan_e90ujbMbAUgnG",
      ],
      EU: [
        "plan_Q73chdoXOteMs",
        "plan_c0nh24tCYJGKm",
        "plan_xwVQvl5AaIA5J",
        "plan_CddtfK8VEpRld",
        "plan_0ThTMbnNFodzQ",
        "plan_a1MxvSvuCWfYs",
        "plan_TmLgADvKWiJqw",
        "plan_4vSmB4Ua8m0J8",
        "plan_VlYbWZRWXMjzl",
        "plan_abZy4dXHQb1Zv",
        "plan_2Z7lopNBMYejZ",
        "plan_mhCFG16CGUC4P",
      ],
    },
  },
  {
    name: "Tenancy File",
    url: "https://tenancy-file.onrender.com/services/tenancy-file-review",
    plans: [
      "plan_OtegSEz5Ne3Ic",
      "plan_C3HPuvg8R0ycy",
      "plan_FL3akTYYugOdO",
      "plan_1z4IF2r5FCO6m",
      "plan_nycOvW4DLVgEY",
      "plan_mSdpEHlp4kuT4",
      "plan_A6LXrzMyznfSi",
      "plan_0ZjyItryRfHrJ",
      "plan_UskEIHSDVznb3",
      "plan_tZQq6gPBqBtHz",
      "plan_Cg4UUcQj4NAUC",
      "plan_5M9F4p3IGLPFc",
    ],
    ladders: {
      CA: [
        "plan_IWjdxodh14vq2",
        "plan_v6p4zFYPI9DEN",
        "plan_CSrTnk4028KZ9",
        "plan_exkwY4lxE77Qd",
        "plan_oq9RETRphBmnB",
        "plan_CM24UzZRBzGiy",
        "plan_b4SA7kwk9XuPB",
        "plan_VhJize1aKkL3l",
        "plan_AlXBGQStvymfl",
        "plan_Kvsk4o7OFweh7",
        "plan_IrRLCIkOtnXfI",
        "plan_D7UgX7eP5DrrJ",
      ],
      UK: [
        "plan_TXawOZRMCRtj3",
        "plan_fYZhtJDfeRYcy",
        "plan_LqgN6WBhetMSf",
        "plan_52xRM2aTSpwGi",
        "plan_YFuqNP9hQJKq0",
        "plan_PUCUAbceUasr1",
        "plan_WXtJgi31DcM6w",
        "plan_O6pCbIpfjEcwr",
        "plan_cQg1GNij09YxF",
        "plan_qTLRpi01LUSsb",
        "plan_xQnoy7VoTAtcJ",
        "plan_WMxvnhjvYukFj",
      ],
      EU: [
        "plan_DXzarAso89vjq",
        "plan_pJddqF8VatDUf",
        "plan_yowWlTRLJ9bEW",
        "plan_LcusqbnCW8QZz",
        "plan_V8a6dNvdMOfPY",
        "plan_jHoNs6hWx2iVf",
        "plan_ewyzuw5o8amGG",
        "plan_7phcVIPv5QWyn",
        "plan_gcdotupS0l3oP",
        "plan_mm7K1QOPhZB3q",
        "plan_hxc64noDV5nP5",
        "plan_0PaBVJXsz0vjc",
      ],
    },
  },
  {
    name: "Itinerary",
    url: "https://itinerary-d8fg.onrender.com/services/itinerary-review",
    plans: [
      "plan_TC5LumyYRjCW4",
      "plan_s0Q9FNyG5Cfe4",
      "plan_WpuwdGWDPLYMX",
      "plan_5C90UqJW0DOtj",
      "plan_SqWYVDcIN0D62",
      "plan_KCMxWVOIXNY9w",
      "plan_QROPXlyOrw0R8",
      "plan_7onWIv81Ez1U0",
      "plan_CH4KXrUD9kiGQ",
      "plan_5RdWNyz604QMh",
      "plan_h31wek67A20nu",
      "plan_J2folsFCsjhAz",
    ],
    ladders: {
      CA: [
        "plan_szGB5atmXsSun",
        "plan_duk2NlbBBmh5D",
        "plan_BUGCKQ4hWXqRp",
        "plan_gqiisPsBO9RJi",
        "plan_nSObu5qP4BCaE",
        "plan_ZXpW4SNPQ5l0b",
        "plan_4TxKaGXbpXlIl",
        "plan_FjgbtC8fO9eBC",
        "plan_sQ6dBVGE72oVC",
        "plan_rdoi1M8vDjw6h",
        "plan_iz7getRBbU7bN",
        "plan_AlnMz2iGJL8Cd",
      ],
      UK: [
        "plan_5h1JhEAxb7iI8",
        "plan_hOOR10icm2d5k",
        "plan_cxXmVQi0Sgu8O",
        "plan_JDNry9PdDvfaG",
        "plan_RgoegsHPDxda3",
        "plan_fFkA683C3MJND",
        "plan_M4dRdxwIwqHoK",
        "plan_YPntmXLgU0lwF",
        "plan_see7mdehC921D",
        "plan_73JUOghUMISH2",
        "plan_Ux8sCIPzGWMqF",
        "plan_I3PqGTEjLALQQ",
      ],
      EU: [
        "plan_dmFUxwuzIuser",
        "plan_7pAm3aHnX5SgK",
        "plan_Fdl3lNLDFPfkm",
        "plan_uKrCgP7MkIDMR",
        "plan_PVTjFZFwLKtVS",
        "plan_JSuKfbLyFiCAv",
        "plan_Jzwa1ujNVeFOg",
        "plan_oGFLDZWVYG1LH",
        "plan_FFJSplNVCHeF9",
        "plan_BFFMDRuQOWRAi",
        "plan_4pQgpPit6LUkU",
        "plan_sZGibQJ0ny75E",
      ],
    },
  },
  {
    name: "Audit File",
    url: "https://audit-file.onrender.com/services/audit-file-review",
    plans: [
      "plan_ipxs84iUlUJoW",
      "plan_KADYN4k5Ke8Cp",
      "plan_mmI28N8u4craX",
      "plan_rfKXnKfp6Tdpa",
      "plan_dYIfiiDm8htHJ",
      "plan_xGqZoAwZYaZH8",
      "plan_QVFwHRQvsC3gp",
      "plan_YRl4RWhUovwaA",
      "plan_sWggd8mUtSla4",
      "plan_hHkchEeXWbjJy",
      "plan_itvOLyPNfGxg3",
      "plan_AEHggAFBwjtVt",
    ],
    ladders: {
      CA: [
        "plan_omPmTM4wcgHXd",
        "plan_eMcEAdn2Y3GhW",
        "plan_kf4KTSAWHZSDa",
        "plan_cerJjG6VlHHrS",
        "plan_zEnS0i0M7ZUrQ",
        "plan_MY0k472yVaTP4",
        "plan_bgeAX20WtucGW",
        "plan_rj3k9HJbexRkI",
        "plan_hj0lp6OIYFmA8",
        "plan_5pDskrfa6jazr",
        "plan_Mhk045zBoXtpO",
        "plan_yHAJOGOwZv7MD",
      ],
      UK: [
        "plan_d9YKaTKvGI1Eu",
        "plan_Qz12eqUPlK5PI",
        "plan_836QDDPXOH9WA",
        "plan_Lg0NqNxtc7WiZ",
        "plan_YRaeup1v4bN8A",
        "plan_lX2xzWMpnHyzs",
        "plan_7zNg4XoEOrGig",
        "plan_gUM8wuU60CMbV",
        "plan_EIVKr3QkH71s1",
        "plan_MTX8s805sXEAM",
        "plan_wwKOif1PISdNU",
        "plan_osTMlWmGqEQ5o",
      ],
      EU: [
        "plan_RZY3s0RHpZuea",
        "plan_u9sSEL926sYyD",
        "plan_bf1t39vp5Y5Nq",
        "plan_f6fkJJyCBt22l",
        "plan_GpQVXwcwko28F",
        "plan_qo4mXCGowrRBR",
        "plan_27Qpqw9HVnnX1",
        "plan_Ik2Ol4K5y11Zz",
        "plan_5DGVBAk1vtBTJ",
        "plan_FqMfmfLVMYp3c",
        "plan_rvLUWnvEqDTDm",
        "plan_teuQYBVYQrrBG",
      ],
    },
  },
  {
    name: "Budget Model",
    url: "https://budget-model.onrender.com/services/budget-model-review",
    plans: [
      "plan_ftKbQgKZUUNmq",
      "plan_JN7IMqxmQgWFO",
      "plan_97VDqkk3igVwp",
      "plan_pu5LbSs6AveVe",
      "plan_jrSZ0In5633RT",
      "plan_bVJrmtqMeYsIq",
      "plan_FnpI204ZRMU2y",
      "plan_wGOQTgaizOXJ9",
      "plan_0OchGgDx2EFP0",
      "plan_DJrJA1KPlv7tZ",
      "plan_4AblAeeVfR4pb",
      "plan_5qUDoVWQxGurp",
    ],
    ladders: {
      CA: [
        "plan_ivbIcKM7gW5kx",
        "plan_DkQn6sgHykRiG",
        "plan_2mDPV97BSVEDq",
        "plan_KrQukeDbfjyiN",
        "plan_e4haO3faCEBhO",
        "plan_YXzQm4EUJ6yxK",
        "plan_JBAYk72wkTQ6A",
        "plan_h0asUNrYBZPfV",
        "plan_QsjlJdT1eKStl",
        "plan_w47nXXHLIcG3q",
        "plan_N5ymH3w7sObOE",
        "plan_F5vzpBDldjqQr",
      ],
      UK: [
        "plan_pVfRtIqTXLsMn",
        "plan_hGP0uVgMsHMoD",
        "plan_gpoRyAgDehtjB",
        "plan_5IwhcJgsVaCSL",
        "plan_j43LIeWQEjz3j",
        "plan_ye8ClDO09Z3WZ",
        "plan_3Qter9jCOiBNW",
        "plan_AZ2vP3tRkH2sc",
        "plan_BB0OCZxt3yYaz",
        "plan_NajybIKUH9nvT",
        "plan_SfLAZn7Bc7f8I",
        "plan_3ZWAMwZyBjfTr",
      ],
      EU: [
        "plan_Z1pnrpnZcZ8aV",
        "plan_1TdkG69GcJZHx",
        "plan_a0oKOcAXLTJGH",
        "plan_XTZptN1Gm52PZ",
        "plan_nPZcKd6ifQkew",
        "plan_xL0rgBXzsh51s",
        "plan_d0D4iBnfva8Va",
        "plan_AMTiUfVp7X42l",
        "plan_W9wSANs7WtUDB",
        "plan_0sEy1cMRMPska",
        "plan_e6zjbJtsmS4wT",
        "plan_h8acUh8zjpmFS",
      ],
    },
  },
];

function ladderFor(marketId, plans) {
  return { unitCents: UNIT_CENTS[marketId], plans: plans.slice() };
}

/* Every assertion that must hold before a single write happens. A bad ladder
   is worse than no ladder: services/market reads the presence of one as the
   signal that a market can be charged, so a short or duplicated ladder opens
   a market that cannot actually resolve a plan. */
function validate() {
  const problems = [];
  const seen = new Map();
  const marketIds = MARKETS.filter((m) => !m.isDefault).map((m) => m.id);

  for (const s of SITES) {
    if (!/^https:\/\//i.test(s.url)) problems.push(`${s.name}: url is not https`);
    if (s.plans.length !== partnerRotation.LADDER_STEPS) {
      problems.push(`${s.name}: USD ladder has ${s.plans.length} rungs, expected ${partnerRotation.LADDER_STEPS}`);
    }
    for (const m of marketIds) {
      const l = s.ladders[m];
      if (!l) { problems.push(`${s.name}: no ${m} ladder`); continue; }
      if (l.length !== partnerRotation.LADDER_STEPS) {
        problems.push(`${s.name}: ${m} ladder has ${l.length} rungs, expected ${partnerRotation.LADDER_STEPS}`);
      }
    }
    const all = [...s.plans, ...Object.values(s.ladders).flat()];
    for (const id of all) {
      if (!/^plan_[A-Za-z0-9]+$/.test(id)) problems.push(`${s.name}: malformed plan id ${id}`);
      const owner = seen.get(id);
      /* Both halves of this have already happened once: a currency block
         pasted twice within one site, and a block belonging to a different
         business pasted under this one. Either sells the wrong thing in the
         wrong currency, and neither is visible by eye in 48 lines of
         random-looking ids. */
      if (owner === s.name) problems.push(`${s.name}: plan id ${id} appears twice — a block was pasted twice`);
      else if (owner) problems.push(`plan id ${id} is listed under both ${owner} and ${s.name}`);
      else seen.set(id, s.name);
    }
  }
  return problems;
}

/* WHICH CONFIGURED ROW IS THIS SITE, if any.
 *
 * The URL is tried first, because for a site this script itself added that
 * is exact. It is not enough on its own: a site configured by hand before
 * this script existed is recorded under whatever URL was typed then, which
 * may be a custom domain rather than the onrender host, or a service slug
 * since renamed. A miss there does not fail safely — it adds a second copy
 * of a site already in the rotation, and both halves then serve.
 *
 * So the USD ladder is the identity of last resort. A Whop plan id belongs
 * to exactly one product in one business, so a row already holding one of
 * these ids IS this site, whatever it is currently called.
 */
function findRow(config, s) {
  const byUrl = config.savedSites.find((x) => x.url === s.url);
  if (byUrl) return { row: byUrl, how: 'url' };
  const ours = new Set(s.plans);
  const byPlan = config.savedSites.find((x) => (x.plans || []).some((id) => ours.has(id)));
  if (byPlan) return { row: byPlan, how: 'plans' };
  return null;
}

async function main() {
  const apply = process.argv.includes('--apply');

  /* Before the URI check, so a freshly pasted ladder can be proof-read with
     `node scripts/add-partner-sites.js` and no database at all. */
  const problems = validate();
  if (problems.length) {
    console.error('Refusing to run — the data in this script is wrong:');
    for (const p of problems) console.error('  ' + p);
    process.exit(1);
  }
  console.log(`${SITES.length} sites validated: ${partnerRotation.LADDER_STEPS} rungs x 4 markets each, no duplicate plan ids.\n`);

  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI is not set.'); process.exit(1); }

  await mongoose.connect(uri);
  const config = await SiteConfig.getValue('partnerExperience', { apiKey: '', routes: [], savedSites: [] });
  if (!Array.isArray(config.savedSites)) config.savedSites = [];

  /* Resolved once, up front: the clash check below has to know which rows are
     legitimately ours before it can call a shared plan id a mistake. */
  const matched = new Map();
  for (const s of SITES) {
    const hit = findRow(config, s);
    if (hit) matched.set(s, hit);
  }
  const claimed = new Set([...matched.values()].map((m) => m.row));

  /* Any plan id already configured on a DIFFERENT site is a paste error, and
     the only moment it is cheap to catch is before the write. */
  const mine = new Set(SITES.flatMap((s) => [...s.plans, ...Object.values(s.ladders).flat()]));
  const clashes = [];
  for (const site of config.savedSites) {
    if (claimed.has(site)) continue;
    const existing = [...(site.plans || []), ...Object.values(site.ladders || {}).flatMap((l) => l.plans || [])];
    for (const id of existing) if (mine.has(id)) clashes.push(`${id} is already on "${site.name}"`);
  }
  if (clashes.length) {
    console.error('Refusing to run — these plan ids already belong to another site:');
    for (const c of clashes) console.error('  ' + c);
    await mongoose.disconnect();
    process.exit(1);
  }

  let added = 0;
  let updated = 0;
  const resolved = new Map();
  for (const s of SITES) {
    const ladders = {};
    for (const [m, plans] of Object.entries(s.ladders)) ladders[m] = ladderFor(m, plans);
    const fields = {
      unitCents: UNIT_CENTS.US,
      plans: s.plans.slice(),
      ladders,
    };

    const hit = matched.get(s);
    if (hit) {
      /* `enabled` is deliberately NOT in `fields`. Re-running this script must
         never resume a site somebody paused on purpose — the same rule the
         group toggle follows, where pausing is never silently undone. A new
         site starts enabled; an existing one keeps whatever it already was. */
      Object.assign(hit.row, fields);
      /* On a URL match the row is one this script owns, so the name is kept in
         step. On a PLAN match it is somebody's existing configuration found by
         its ladder, and the name and URL are left exactly as they are: this
         script knows which plans to charge, not where traffic should be sent,
         and rewriting a working custom domain to an onrender host would send
         buyers somewhere else. */
      if (hit.how === 'url') hit.row.name = s.name;
      resolved.set(s, hit.row);
      updated += 1;
      console.log(`  update  ${s.name.padEnd(12)} ${hit.row.url}`
        + (hit.how === 'plans' ? `   (matched by its USD ladder, listed as "${hit.row.name}")` : '')
        + (hit.row.enabled === false ? '   (left paused)' : ''));
    } else {
      const row = {
        ...fields,
        name: s.name,
        url: s.url,
        enabled: true,
        id: crypto.randomUUID(),
        groupId: '',
        baseUrl: new URL(s.url).origin,
        stats: { orders: 0, lastOrderAt: null },
      };
      config.savedSites.push(row);
      resolved.set(s, row);
      added += 1;
      console.log(`  add     ${s.name.padEnd(12)} ${s.url}`);
    }
  }

  console.log(`\n${added} to add, ${updated} to update. Total sites after: ${config.savedSites.length}.`);

  if (!apply) {
    console.log('\nDRY RUN — nothing was written. Re-run with --apply to commit.');
  } else {
    await SiteConfig.setValue('partnerExperience', config);
    console.log('\nWritten.');
    const after = await SiteConfig.getValue('partnerExperience', { savedSites: [] });
    /* Read back by id, not by URL: a row matched on its ladder keeps its own
       URL, and looking it up by the one in this file would report a site that
       was written correctly as MISSING. */
    for (const s of SITES) {
      const id = (resolved.get(s) || {}).id;
      const row = (after.savedSites || []).find((x) => x.id === id);
      const markets = row ? Object.keys(row.ladders || {}).sort().join(',') : '-';
      console.log(`  ${row ? 'ok  ' : 'MISSING'} ${s.name.padEnd(12)} markets=US,${markets} rungs=${row ? (row.plans || []).length : 0}`);
    }
  }

  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
