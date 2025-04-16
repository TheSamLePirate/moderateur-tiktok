from datetime import datetime

# Obtenir l'heure actuelle
heure_actuelle = datetime.now().time()

# Afficher l'heure
print("L'heure actuelle est :", heure_actuelle.strftime("%H:%M:%S"))