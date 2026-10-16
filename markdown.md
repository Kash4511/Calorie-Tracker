# 🍛 Indian Food Nutrition & Calories Dataset

## Overview
A comprehensive nutritional dataset containing 250+ popular Indian food items with detailed macronutrient and micronutrient information. Perfect for beginners practicing data analysis, machine learning, and nutritional research.

## 📊 Dataset Features
- **250+ Indian food items** across all major categories
- **15 nutritional and categorical features**
- **Covers all Indian regions** (North, South, East, West)
- **Multiple cooking methods** and spice levels
- **Beginner-friendly** with clean, standardized data

## 🏷️ Column Descriptions

| Column | Description | Unit |
|--------|-------------|------|
| Food_Item | Name of the Indian dish | Text |
| Category | Food type classification | Veg/Non-Veg/Lentils/Snacks/Dessert/Bread |
| Calories_per_100g | Energy content | kcal/100g |
| Protein_g | Protein content | grams/100g |
| Fat_g | Fat content | grams/100g |
| Carbs_g | Carbohydrate content | grams/100g |
| Fiber_g | Dietary fiber | grams/100g |
| Sugar_g | Sugar content | grams/100g |
| Sodium_mg | Sodium content | mg/100g |
| Potassium_mg | Potassium content | mg/100g |
| Vitamin_C_mg | Vitamin C content | mg/100g |
| Calcium_mg | Calcium content | mg/100g |
| Iron_mg | Iron content | mg/100g |
| Spice_Level | Spice intensity | Mild/Medium/Spicy |
| Cooking_Method | Preparation technique | Text |
| Region | Indian region of origin | Text |

## 🎯 Potential Use Cases

### 🔍 Exploratory Data Analysis (EDA)
- Compare nutritional profiles across regions
- Analyze cooking method impact on nutrition
- Identify healthiest and least healthy options

### 🤖 Machine Learning Projects
- **Classification**: Predict food category from nutrition
- **Regression**: Predict calorie content from ingredients
- **Clustering**: Group similar foods together
- **Recommendation**: Suggest healthier alternatives

### 📈 Statistical Analysis
- Correlation between nutrients
- Regional dietary pattern analysis
- Spice level vs. nutritional content

### 🏥 Health & Nutrition Research
- Diet planning applications
- Calorie counting tools
- Nutritional education projects

## 🔑 Key Insights from Dataset

- **Protein-rich foods**: Chicken dishes, lentils, paneer items
- **Highest calorie foods**: Fried items, biryanis, desserts
- **Healthiest options**: Steamed foods, lentil dishes, fermented items
- **Regional patterns**: South Indian dishes tend to be spicier
- **Cooking method impact**: Deep-fried items have 2-3x more calories

## 📋 Data Quality
- ✅ **No missing values**
- ✅ **Standardized units** (all per 100g serving)
- ✅ **Verified nutritional data** from reliable sources
- ✅ **Consistent formatting** across all entries
- ✅ **Balanced representation** across food categories

## 🚀 Getting Started

```python
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Load dataset
df = pd.read_csv('indian_food_nutrition_complete.csv')

# Basic info
print(f"Dataset shape: {df.shape}")
print(f"Categories: {df['Category'].unique()}")
print(f"Regions: {df['Region'].unique()}")

# Quick visualization
plt.figure(figsize=(10, 6))
sns.boxplot(data=df, x='Category', y='Calories_per_100g')
plt.xticks(rotation=45)
plt.title('Calories Distribution by Food Category')
plt.show()