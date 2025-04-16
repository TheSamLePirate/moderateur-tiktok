from TikTokLive import TikTokLiveClient
from TikTokLive.events import ConnectEvent, CommentEvent, JoinEvent
import pync  # Added import for macOS notifications
import argparse  # Import for parsing command line arguments

from openai import OpenAI
gpt = OpenAI()

# Parse command line arguments
def parse_arguments():
    parser = argparse.ArgumentParser(description="TikTok Live Chat Moderator")
    parser.add_argument('--channel', type=str, required=True, help='TikTok channel to monitor (e.g. @username)')
    return parser.parse_args()

SYSTEM_PROMPT = """Vous êtes un assistant qui peut aider avec le chat en direct TikTok.
Vous recevrez des commentaires du chat provenant du canal en direct. Pour chaque nouvelle mise à jour du chat, vous direz les nouveaux commentaires.
Votre réponse sera par exemple : "dawdaw a dit : 'Bonjour'" pour le message : "dawdaw.hanna":"bonjour"
pour les messages de reponses de type "dawdaw.hana" :"@bis merci, je suis d'accord" tu dira "hana a répondu à bis : merci, je suis d'accord"
Pour le nom d'utilisateur, assurez-vous de le dire d'une façon facile à prononcer.
Pour les smileys ou les emojis, prononce les simplement. un seul par message, sinon, c'est trop long.
ne dis pas plusieurs emojis par messages. c'est trop long.
tu lis les messages addressés à @SamLePirate, tu ne réponds pas à d'autres messages.
Si il y a des fautes d'orthographe ou des fautes des frappes dans le message, corrige les dans ta réponse.
"""

SYSTEM_PROMPT_SMART = """Vous êtes un assistant qui réponds au chat en direct TikTok.
Vous recevrez des commentaires du chat provenant du canal en direct. Pour chaque nouvelle mise à jour du chat, vous repondrez.
Pour le nom d'utilisateur, assurez-vous de le dire d'une façon facile à prononcer.
Pour les smileys ou les emojis, prononce les simplement. un seul par message, sinon, c'est trop long.
ne dis pas plusieurs emojis par messages. c'est trop long.
Si il y a des fautes d'orthographe ou des fautes des frappes dans le message, corrige les dans ta réponse.
Si le commentaire est une question, tu réponds par une phrase courte et concise.
Si le commentaire est faux, contredit le.
Essaye de reconnaitre le sarcasme et la critique des religions.
Defends la declaration universelle des droits de l'homme, le progressisme.
Tu combats les discriminations, les racismes, les sexismes, les agissements de nature homophobe, transphobe, etc.
"""

notFirstTime = False

def analyse_commentForMe(commentList):
    userPrompt = ""
    for comment in commentList:
        userPrompt += f"{comment['username']}: {comment['message']}\n"
    userPrompt += "Maintant, tu va dire les nouveaux commentaires."
    completion = gpt.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user","content": userPrompt}
        ]
    )
        
    print(completion.choices[0].message.content)

    if completion.choices[0].message.content=="Ok" or completion.choices[0].message.content=="ok" or completion.choices[0].message.content=="Ok." or completion.choices[0].message.content=="ok." :
        return
    else:
        pync.notify(completion.choices[0].message.content, title="TikTok Moderator - Analyse", sound="Ping", appIcon="", contentImage="", activate="com.apple.Terminal")

def analyse_comment(commentList,allComments):
    userPrompt = "Voici les anciens commentaires du chat :"
    for comment in allComments:
        userPrompt += f"{comment['username']}: {comment['message']}\n"
    userPrompt += "Voici les nouveaux commentaires :"
    for comment in commentList:
        userPrompt += f"{comment['username']}: {comment['message']}\n"
    userPrompt += "Maintant, tu va répondre aux nouveaux commentaires"
    completion = gpt.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT_SMART},
            {"role": "user","content": userPrompt}
        ]
    )

    print("On pourrait répondre :")   
    print(completion.choices[0].message.content)

    if completion.choices[0].message.content=="Ok" or completion.choices[0].message.content=="ok" or completion.choices[0].message.content=="Ok." or completion.choices[0].message.content=="ok." :
        return



# Define the event handlers without decorators
async def on_connect(event: ConnectEvent):
    global channel  # Reference the global channel variable
    print(f"Connected to @{event.unique_id} (Room ID: {event.room_id})")
    
    # Display a test notification on startup
    notification_title = "TikTok Moderator - Connected"
    notification_message = f"Successfully connected to {channel}\nReady to monitor comments"
    pync.notify(notification_message, title=notification_title, sound="Ping", appIcon="", contentImage="", activate="com.apple.Terminal")

allComments = []
async def on_comment(event: CommentEvent) -> None:
    global notFirstTime
    global allComments
    commentList = []
    print(f"{event.user.nickname} -> {event.comment}")
    if notFirstTime:
        allComments.append({"username": event.user.nickname, "message": event.comment})
        # on ne garde que les 100 derniers commentaires
        if len(allComments) > 10:
            allComments.pop(0)
        commentList.append({"username": event.user.nickname, "message": event.comment})
        response = gpt.moderations.create(
        model="omni-moderation-latest",
        input=event.comment,
        )
        if response.results[0].flagged:
            # Print only flagged categories and their scores
            categories = response.results[0].categories
            scores = response.results[0].category_scores
            
            print("\nFlagged categories:")
            raison=""
            for category in categories.__dict__:
                if getattr(categories, category):

                    raison+=f"{category} avec un score de {getattr(scores, category):.1f}\n"
                    print(f"{category}: {getattr(scores, category):.3f}")
            
            # Display a visual notification
            notification_title = "Message problématique détecté!"
            notification_message = f"{event.user.nickname}: {event.comment}\nRaison: {raison.strip()}"
            pync.notify(notification_message, title=notification_title, sound="Ping", appIcon="", contentImage="", activate="com.apple.Terminal")
            

        
        if event.comment.startswith("@SamLePirate"):
            print("Message adressé à @SamLePirate")
            analyse_commentForMe(commentList)
        else:
            #analyse_comment(commentList,allComments)
            pass
    else:
        notFirstTime = True

if __name__ == '__main__':
    # Parse command line arguments
    args = parse_arguments()
    channel = args.channel
    
    # Ensure channel starts with @
    if not channel.startswith('@'):
        channel = '@' + channel
    
    print(f"Starting moderation for channel: {channel}")
    
    # Create the client with the provided channel
    client = TikTokLiveClient(unique_id=channel)
    
    # Register event handlers
    client.add_listener(ConnectEvent, on_connect)
    client.add_listener(CommentEvent, on_comment)
    
    # Run the client and block the main thread
    # await client.start() to run non-blocking
    client.run()