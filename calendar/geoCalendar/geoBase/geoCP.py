import pandas as pd

df = pd.read_excel("communes-france.xlsx")
df.to_json("communes-france.json", orient="records", force_ascii=False)
