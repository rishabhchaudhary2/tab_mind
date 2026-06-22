Open Side Panel

↓

React asks:

"Give me the folders."

↓

Background computes folders

↓

React displays them 


Now : ---- >
            Chrome Events

                  │

                  ▼

           Background Worker

                  │

        getGroupedTabs()

                  │

                  ▼

        broadcastTabsUpdated()

                  │

                  ▼

         React onMessage()

                  │

                  ▼

          setFolders()




    Chrome

↓

onRemoved event

↓

Background

↓

getGroupedTabs()

↓

sendMessage({
    type:"TABS_UPDATED",
    payload: folders
})

↓

Chrome Runtime

↓

Find everyone listening

↓

Calls listener(message)

↓

setFolders(message.payload)

↓

React re-renders