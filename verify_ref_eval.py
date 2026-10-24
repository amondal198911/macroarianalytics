import json, numpy as np
from scipy import stats as st
rng = np.random.default_rng(3)
a = list(np.round(rng.normal(5, 2, 30), 3)); b = list(np.round(rng.normal(6, 3, 25), 3)); c = list(np.round(rng.normal(5.5, 1, 20), 3))
b[3] = a[2]  # a tie
ref = dict(welch=st.ttest_ind(a, b, equal_var=False), mw=st.mannwhitneyu(a, b, alternative='two-sided', method='asymptotic'),
           kw=st.kruskal(a, b, c), an=st.f_oneway(a, b, c), bf=st.levene(a, b, c, center='median'))
out = {k: [float(v.statistic), float(v.pvalue)] for k, v in ref.items()}
json.dump(dict(a=a, b=b, c=c, ref=out), open(__import__('pathlib').Path(__file__).resolve().parent.parent / 'build' / 'verify_eval.json', 'w')); print(out)
