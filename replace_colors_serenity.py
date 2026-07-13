import os
import glob
import re

replacements = {
    "#f5ecd7": "#FFFFFF",
    "#efe3c4": "#F8F9FA",
    "#e8d8b8": "#F8F9FA",
    "#2b2620": "#4A4D4E",
    "#f0b840": "#EED05E",
    "#e87432": "#EED05E",
    "#b85a22": "#D6B847",
    "#6b8e3d": "#CC7069",
    "#4c6630": "#CC7069",
    "#c8d68a": "#EAD6D5",
    "#8e4e22": "#CC7069",
    "#8a7d65": "#7A7D7E",
    "#fdf6ea": "#DCECF0",
    "#c23838": "#CC7069",
    "#e0d8c4": "#DCECF0",
    "#87CEEB": "#DCECF0",
    "#fdfaf2": "#FFFFFF",
    "#c8b6a6": "#B0B3B4",
    "#a82e2e": "#B85C56",
    "#6b5d4a": "#4A4D4E",
    "#8eaa4a": "#CC7069",
    "#d4a85c": "#EED05E",
    "#c49640": "#D6B847",
    "#6b3a18": "#B85C56",
    "#c8a050": "#EED05E",
    "#5a4a3a": "#7A7D7E",
    "#e83232": "#CC7069",
    "rgba(138, 125, 101, 0.3)": "rgba(74, 77, 78, 0.1)",
    "rgba(138, 125, 101, 0.4)": "rgba(74, 77, 78, 0.15)",
    "rgba(232, 116, 50, 0.35)": "rgba(238, 208, 94, 0.35)",
    "rgba(43,38,32": "rgba(74,77,78",
    "rgba(194,56,56": "rgba(204,112,105",
    "rgba(184,90,34": "rgba(238,208,94",
    "#f08a48": "#EED05E",
    "rgba(232, 116, 50, 0.4)": "rgba(238, 208, 94, 0.4)",
    "rgba(138,125,101,0.2)": "rgba(74,77,78,0.1)",
    "rgba(138,125,101,0.25)": "rgba(74,77,78,0.1)",
    "rgba(138,125,101,0.3)": "rgba(74,77,78,0.1)",
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for old, new in replacements.items():
        # case insensitive replacement for hex
        new_content = new_content.replace(old, new)
        new_content = new_content.replace(old.upper(), new)
        new_content = new_content.replace(old.lower(), new)
        
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, _, files in os.walk('/home/pro/Downloads/intern/03_cauca/src'):
    for file in files:
        if file.endswith(('.tsx', '.ts', '.css')):
            process_file(os.path.join(root, file))
