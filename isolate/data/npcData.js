// Extracted from game2.html — pure data, no logic.

const NPC_DATA = {
  old_man: {
    id: 'old_man',
    name: 'Elder Rowan',
    portrait: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjAgMTIwIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0ib2xkTWFuU2tpbiIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjRDRBNTc0Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI0M0OTQ2NCIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CgogIDwhLS0gQmFja2dyb3VuZCBjaXJjbGUgLS0+CiAgPGNpcmNsZSBjeD0iNjAiIGN5PSI2MCIgcj0iNTYiIGZpbGw9IiMxQTFBMkUiIHN0cm9rZT0iIzMzMzM1NSIgc3Ryb2tlLXdpZHRoPSIyIi8+CgogIDwhLS0gTmVjayAtLT4KICA8cmVjdCB4PSI0OCIgeT0iODIiIHdpZHRoPSIyNCIgaGVpZ2h0PSIxMiIgZmlsbD0idXJsKCNvbGRNYW5Ta2luKSIvPgoKICA8IS0tIFNoaXJ0IGNvbGxhciAtLT4KICA8cGF0aCBkPSJNMzggODggUTQ4IDgyIDYwIDg1IFE3MiA4MiA4MiA4OCBMODIgMTAwIEwzOCAxMDAgWiIgZmlsbD0iIzRBM0EyQSIvPgogIDxwYXRoIGQ9Ik01MCA4NSBMNTUgOTIiIHN0cm9rZT0iIzNBMkExQSIgc3Ryb2tlLXdpZHRoPSIwLjUiLz4KICA8cGF0aCBkPSJNNzAgODUgTDY1IDkyIiBzdHJva2U9IiMzQTJBMUEiIHN0cm9rZS13aWR0aD0iMC41Ii8+CgogIDwhLS0gRmFjZSBzaGFwZSAtLT4KICA8ZWxsaXBzZSBjeD0iNjAiIGN5PSI1OCIgcng9IjI2IiByeT0iMzAiIGZpbGw9InVybCgjb2xkTWFuU2tpbikiLz4KCiAgPCEtLSBFYXJzIC0tPgogIDxlbGxpcHNlIGN4PSIzNCIgY3k9IjU4IiByeD0iNSIgcnk9IjgiIGZpbGw9IiNDNDk0NjQiLz4KICA8ZWxsaXBzZSBjeD0iODYiIGN5PSI1OCIgcng9IjUiIHJ5PSI4IiBmaWxsPSIjQzQ5NDY0Ii8+CgogIDwhLS0gSGFpciAod2hpdGUvZ3JheSwgcmVjZWRpbmcpIC0tPgogIDxwYXRoIGQ9Ik0zNiA0MiBRNDAgMjUgNjAgMjIgUTgwIDI1IDg0IDQyIFE4MiAzNSA3NSAzMiBRNjAgMjggNDUgMzIgUTM4IDM1IDM2IDQyIiBmaWxsPSIjQ0NDQ0NDIi8+CiAgPCEtLSBTaWRlIGhhaXIgLS0+CiAgPHBhdGggZD0iTTM2IDQyIFEzNCA1MCAzNSA1OCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjQ0NDQ0NDIiBzdHJva2Utd2lkdGg9IjMiLz4KICA8cGF0aCBkPSJNODQgNDIgUTg2IDUwIDg1IDU4IiBmaWxsPSJub25lIiBzdHJva2U9IiNDQ0NDQ0MiIHN0cm9rZS13aWR0aD0iMyIvPgoKICA8IS0tIFdyaW5rbGVzIC0tPgogIDxwYXRoIGQ9Ik00NCA0OCBRNTAgNDYgNTYgNDgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0IwODA1MCIgc3Ryb2tlLXdpZHRoPSIwLjUiIG9wYWNpdHk9IjAuNiIvPgogIDxwYXRoIGQ9Ik02NCA0OCBRNzAgNDYgNzYgNDgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0IwODA1MCIgc3Ryb2tlLXdpZHRoPSIwLjUiIG9wYWNpdHk9IjAuNiIvPgogIDxwYXRoIGQ9Ik00MiA1NSBRNTAgNTMgNTggNTUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0IwODA1MCIgc3Ryb2tlLXdpZHRoPSIwLjQiIG9wYWNpdHk9IjAuNCIvPgoKICA8IS0tIEV5ZXMgKHRpcmVkLCBraW5kKSAtLT4KICA8ZWxsaXBzZSBjeD0iNDgiIGN5PSI1MiIgcng9IjUiIHJ5PSIzLjUiIGZpbGw9IiNGRkYiLz4KICA8Y2lyY2xlIGN4PSI0OCIgY3k9IjUyIiByPSIyLjUiIGZpbGw9IiM1QTNBMUEiLz4KICA8Y2lyY2xlIGN4PSI0OCIgY3k9IjUxLjUiIHI9IjEiIGZpbGw9IiMxQTFBMUEiLz4KICA8Y2lyY2xlIGN4PSI0NyIgY3k9IjUxIiByPSIwLjUiIGZpbGw9IiNGRkYiIG9wYWNpdHk9IjAuNyIvPgoKICA8ZWxsaXBzZSBjeD0iNzIiIGN5PSI1MiIgcng9IjUiIHJ5PSIzLjUiIGZpbGw9IiNGRkYiLz4KICA8Y2lyY2xlIGN4PSI3MiIgY3k9IjUyIiByPSIyLjUiIGZpbGw9IiM1QTNBMUEiLz4KICA8Y2lyY2xlIGN4PSI3MiIgY3k9IjUxLjUiIHI9IjEiIGZpbGw9IiMxQTFBMUEiLz4KICA8Y2lyY2xlIGN4PSI3MSIgY3k9IjUxIiByPSIwLjUiIGZpbGw9IiNGRkYiIG9wYWNpdHk9IjAuNyIvPgoKICA8IS0tIEV5ZWJyb3dzIChidXNoeSwgZ3JheSkgLS0+CiAgPHBhdGggZD0iTTQyIDQ2IFE0OCA0MyA1NCA0NiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjQUFBQUFBIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDxwYXRoIGQ9Ik02NiA0NiBRNzIgNDMgNzggNDYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0FBQUFBQSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KCiAgPCEtLSBOb3NlIC0tPgogIDxwYXRoIGQ9Ik01OCA1NSBRNjAgNjIgNjIgNTUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0IwODA1MCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgoKICA8IS0tIE1vdXRoIChzbGlnaHQgc21pbGUpIC0tPgogIDxwYXRoIGQ9Ik01MCA2OCBRNjAgNzQgNzAgNjgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzhCNUUzQyIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgoKICA8IS0tIEJlYXJkIChzaG9ydCwgZ3JheSkgLS0+CiAgPHBhdGggZD0iTTQyIDcyIFE0NSA4MCA1MCA4MiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjQkJCQkJCIiBzdHJva2Utd2lkdGg9IjEuNSIgb3BhY2l0eT0iMC43Ii8+CiAgPHBhdGggZD0iTTQ4IDc0IFE1MCA4MiA1MiA4NCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjQkJCQkJCIiBzdHJva2Utd2lkdGg9IjEiIG9wYWNpdHk9IjAuNiIvPgogIDxwYXRoIGQ9Ik01NSA3NiBRNTggODQgNjAgODUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0JCQkJCQiIgc3Ryb2tlLXdpZHRoPSIxIiBvcGFjaXR5PSIwLjUiLz4KICA8cGF0aCBkPSJNNjUgNzYgUTYyIDg0IDYwIDg1IiBmaWxsPSJub25lIiBzdHJva2U9IiNCQkJCQkIiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iMC41Ii8+CiAgPHBhdGggZD0iTTcyIDc0IFE3MCA4MiA2OCA4NCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjQkJCQkJCIiBzdHJva2Utd2lkdGg9IjEiIG9wYWNpdHk9IjAuNiIvPgogIDxwYXRoIGQ9Ik03OCA3MiBRNzUgODAgNzAgODIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0JCQkJCQiIgc3Ryb2tlLXdpZHRoPSIxLjUiIG9wYWNpdHk9IjAuNyIvPgoKICA8IS0tIFNjYXIgb24gZm9yZWhlYWQgLS0+CiAgPGxpbmUgeDE9IjUyIiB5MT0iMzgiIHgyPSI1OCIgeTI9IjQyIiBzdHJva2U9IiNCMDgwNTAiIHN0cm9rZS13aWR0aD0iMC44IiBvcGFjaXR5PSIwLjUiLz4KPC9zdmc+Cg==',
    unlocked: true,
    greeting: "Welcome back, traveler. The road has been dangerous, but we're alive.",
    topics: [
      {
        id: 'about_camp',
        text: 'Tell me about the camp.',
        response: "We were farmers, merchants, refugees... The Gravekeeper's rise drove us here. These tents are all we have left. But you — you fight. That gives us hope.",
        affection: 0,
      },
      {
        id: 'about_graveyard',
        text: 'Have you seen anything strange?',
        response: "The graveyard to the east... The dead don't rest easy there. Something ancient keeps them rising. Be careful if you go back.",
        affection: 0,
        flag: 'graveyard_warning',
      },
      {
        id: 'end',
        text: '[End Conversation]',
        response: null,
        close: true,
      }
    ]
  },
  cute_girl: {
    id: 'cute_girl',
    name: 'Lina',
    portrait: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjAgMTIwIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZ2lybFNraW4iIHgxPSIwIiB5MT0iMCIgeDI9IjAiIHkyPSIxIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI0ZGRTBDOCIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNGNUQwQjAiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImdpcmxIYWlyIiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiM0QTIwMjAiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjM0ExNTE1Ii8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KCiAgPCEtLSBCYWNrZ3JvdW5kIGNpcmNsZSAtLT4KICA8Y2lyY2xlIGN4PSI2MCIgY3k9IjYwIiByPSI1NiIgZmlsbD0iIzJBMUEyRSIgc3Ryb2tlPSIjNTUzMzU1IiBzdHJva2Utd2lkdGg9IjIiLz4KCiAgPCEtLSBIYWlyIChsb25nLCBkYXJrIGJyb3duLCBiZWhpbmQgYm9keSkgLS0+CiAgPHBhdGggZD0iTTMwIDQ1IFEyOCA2MCAzMiA4MCBRMzUgOTUgNDAgMTAwIiBmaWxsPSJ1cmwoI2dpcmxIYWlyKSIgc3Ryb2tlPSJub25lIi8+CiAgPHBhdGggZD0iTTkwIDQ1IFE5MiA2MCA4OCA4MCBRODUgOTUgODAgMTAwIiBmaWxsPSJ1cmwoI2dpcmxIYWlyKSIgc3Ryb2tlPSJub25lIi8+CgogIDwhLS0gTmVjayAtLT4KICA8cmVjdCB4PSI1MCIgeT0iODIiIHdpZHRoPSIyMCIgaGVpZ2h0PSIxMCIgZmlsbD0idXJsKCNnaXJsU2tpbikiLz4KCiAgPCEtLSBEcmVzcy9jbG90aGluZyAtLT4KICA8cGF0aCBkPSJNMzUgOTAgUTUwIDg0IDYwIDg3IFE3MCA4NCA4NSA5MCBMODggMTEwIEwzMiAxMTAgWiIgZmlsbD0iIzZCM0E1QSIvPgogIDxwYXRoIGQ9Ik00NSA5MCBMNTAgMTAwIiBzdHJva2U9IiM1QTJBNEEiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjUiLz4KICA8cGF0aCBkPSJNNjAgODggTDYwIDEwNSIgc3Ryb2tlPSIjNUEyQTRBIiBzdHJva2Utd2lkdGg9IjAuNSIgb3BhY2l0eT0iMC41Ii8+CiAgPHBhdGggZD0iTTc1IDkwIEw3MCAxMDAiIHN0cm9rZT0iIzVBMkE0QSIgc3Ryb2tlLXdpZHRoPSIwLjUiIG9wYWNpdHk9IjAuNSIvPgogIDwhLS0gQ29sbGFyIGRldGFpbCAtLT4KICA8cGF0aCBkPSJNNTAgODcgUTU1IDgzIDYwIDg2IFE2NSA4MyA3MCA4NyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOEI1QTdBIiBzdHJva2Utd2lkdGg9IjEiLz4KCiAgPCEtLSBGYWNlIC0tPgogIDxlbGxpcHNlIGN4PSI2MCIgY3k9IjU2IiByeD0iMjQiIHJ5PSIyOCIgZmlsbD0idXJsKCNnaXJsU2tpbikiLz4KCiAgPCEtLSBFYXJzIChzbWFsbCwgd2l0aCBlYXJyaW5ncykgLS0+CiAgPGVsbGlwc2UgY3g9IjM2IiBjeT0iNTYiIHJ4PSI0IiByeT0iNiIgZmlsbD0iI0Y1RDBCMCIvPgogIDxjaXJjbGUgY3g9IjM2IiBjeT0iNjIiIHI9IjIiIGZpbGw9IiNGRkQ3MDAiIG9wYWNpdHk9IjAuOCIvPgogIDxlbGxpcHNlIGN4PSI4NCIgY3k9IjU2IiByeD0iNCIgcnk9IjYiIGZpbGw9IiNGNUQwQjAiLz4KICA8Y2lyY2xlIGN4PSI4NCIgY3k9IjYyIiByPSIyIiBmaWxsPSIjRkZENzAwIiBvcGFjaXR5PSIwLjgiLz4KCiAgPCEtLSBIYWlyIChiYW5ncyBhbmQgc2lkZXMpIC0tPgogIDxwYXRoIGQ9Ik0zNiAzOCBRNDAgMjIgNjAgMjAgUTgwIDIyIDg0IDM4IFE4MiAzMCA3NSAyNyBRNjAgMjIgNDUgMjcgUTM4IDMwIDM2IDM4IiBmaWxsPSJ1cmwoI2dpcmxIYWlyKSIvPgogIDwhLS0gU2lkZSBiYW5ncyAtLT4KICA8cGF0aCBkPSJNMzYgMzggUTMyIDQ4IDM0IDU4IFEzNSA1MCAzOCA0MiIgZmlsbD0idXJsKCNnaXJsSGFpcikiLz4KICA8cGF0aCBkPSJNODQgMzggUTg4IDQ4IDg2IDU4IFE4NSA1MCA4MiA0MiIgZmlsbD0idXJsKCNnaXJsSGFpcikiLz4KICA8IS0tIEhhaXIgc2hpbmUgLS0+CiAgPHBhdGggZD0iTTQ4IDI2IFE1NSAyMyA2MiAyNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNkE0MDQwIiBzdHJva2Utd2lkdGg9IjEiIG9wYWNpdHk9IjAuNCIvPgoKICA8IS0tIEV5ZXMgKGJpZywgY3V0ZSwgYnJvd24pIC0tPgogIDwhLS0gTGVmdCBleWUgLS0+CiAgPGVsbGlwc2UgY3g9IjQ4IiBjeT0iNTIiIHJ4PSI2IiByeT0iNSIgZmlsbD0iI0ZGRiIvPgogIDxjaXJjbGUgY3g9IjQ4IiBjeT0iNTIiIHI9IjMuNSIgZmlsbD0iIzZCM0ExQSIvPgogIDxjaXJjbGUgY3g9IjQ4IiBjeT0iNTEiIHI9IjIiIGZpbGw9IiMzQTFBMEEiLz4KICA8Y2lyY2xlIGN4PSI0Ni41IiBjeT0iNTAiIHI9IjEuMiIgZmlsbD0iI0ZGRiIgb3BhY2l0eT0iMC44Ii8+CiAgPGNpcmNsZSBjeD0iNDkiIGN5PSI1MyIgcj0iMC42IiBmaWxsPSIjRkZGIiBvcGFjaXR5PSIwLjUiLz4KICA8IS0tIEV5ZWxhc2hlcyAtLT4KICA8cGF0aCBkPSJNNDIgNDggUTQ1IDQ2IDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiMyQTEwMDgiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgPHBhdGggZD0iTTQ4IDQ4IFE1MSA0NiA1NCA0OCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMkExMDA4IiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgoKICA8IS0tIFJpZ2h0IGV5ZSAtLT4KICA8ZWxsaXBzZSBjeD0iNzIiIGN5PSI1MiIgcng9IjYiIHJ5PSI1IiBmaWxsPSIjRkZGIi8+CiAgPGNpcmNsZSBjeD0iNzIiIGN5PSI1MiIgcj0iMy41IiBmaWxsPSIjNkIzQTFBIi8+CiAgPGNpcmNsZSBjeD0iNzIiIGN5PSI1MSIgcj0iMiIgZmlsbD0iIzNBMUEwQSIvPgogIDxjaXJjbGUgY3g9IjcwLjUiIGN5PSI1MCIgcj0iMS4yIiBmaWxsPSIjRkZGIiBvcGFjaXR5PSIwLjgiLz4KICA8Y2lyY2xlIGN4PSI3MyIgY3k9IjUzIiByPSIwLjYiIGZpbGw9IiNGRkYiIG9wYWNpdHk9IjAuNSIvPgogIDwhLS0gRXllbGFzaGVzIC0tPgogIDxwYXRoIGQ9Ik02NiA0OCBRNjkgNDYgNzIgNDgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzJBMTAwOCIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICA8cGF0aCBkPSJNNzIgNDggUTc1IDQ2IDc4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiMyQTEwMDgiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CgogIDwhLS0gRXllYnJvd3MgKHRoaW4sIGFyY2hlZCkgLS0+CiAgPHBhdGggZD0iTTQyIDQ0IFE0OCA0MSA1NCA0NCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNEEyMDIwIiBzdHJva2Utd2lkdGg9IjEuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgPHBhdGggZD0iTTY2IDQ0IFE3MiA0MSA3OCA0NCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNEEyMDIwIiBzdHJva2Utd2lkdGg9IjEuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CgogIDwhLS0gQmx1c2ggLS0+CiAgPGVsbGlwc2UgY3g9IjQwIiBjeT0iNjAiIHJ4PSI1IiByeT0iMyIgZmlsbD0iI0ZGQjBBMCIgb3BhY2l0eT0iMC4zIi8+CiAgPGVsbGlwc2UgY3g9IjgwIiBjeT0iNjAiIHJ4PSI1IiByeT0iMyIgZmlsbD0iI0ZGQjBBMCIgb3BhY2l0eT0iMC4zIi8+CgogIDwhLS0gTm9zZSAoc21hbGwsIGN1dGUpIC0tPgogIDxwYXRoIGQ9Ik01OSA1OCBRNjAgNjEgNjEgNTgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0Q0QTA4MCIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KCiAgPCEtLSBNb3V0aCAoc21hbGwgc21pbGUpIC0tPgogIDxwYXRoIGQ9Ik01MyA2NyBRNTcgNzEgNjAgNzAgUTYzIDcxIDY3IDY3IiBmaWxsPSJub25lIiBzdHJva2U9IiNDQzc3NjYiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICA8IS0tIExpcCBzaGluZSAtLT4KICA8cGF0aCBkPSJNNTYgNjggUTU4IDY3IDYwIDY4IiBmaWxsPSJub25lIiBmaWxsPSIjRkZCMEEwIiBvcGFjaXR5PSIwLjMiLz4KCiAgPCEtLSBIYWlyIGFjY2Vzc29yeSAoc21hbGwgZmxvd2VyKSAtLT4KICA8Y2lyY2xlIGN4PSI3OCIgY3k9IjM1IiByPSIzIiBmaWxsPSIjRkY4ODg4Ii8+CiAgPGNpcmNsZSBjeD0iNzgiIGN5PSIzNSIgcj0iMS41IiBmaWxsPSIjRkZBQUFBIi8+CiAgPHBhdGggZD0iTTc1IDM1IEw3OCAzMiBMODEgMzUgTDc4IDM4IFoiIGZpbGw9IiNGRjY2NjYiIG9wYWNpdHk9IjAuNiIvPgo8L3N2Zz4K',
    unlocked: false,
    unlockCondition: 'town_camp_upgraded',
    greeting: "Oh! You fixed up the camp! I'm... I'm Lina. Thank you for making this place safer.",
    topics: [
      {
        id: 'about_herself',
        text: 'How did you end up here?',
        response: "I was a baker's daughter in the city. When the dead started walking, we fled. My family... I don't know if they made it. But I'm grateful to be alive.",
        affection: 1,
      },
      {
        id: 'help',
        text: 'Is there anything I can do to help?',
        response: "If you could clear the graveyard, maybe we could rebuild the city road. People would start coming back. Please... be careful out there.",
        affection: 1,
        flag: 'lina_quest_hint',
      },
      {
        id: 'end',
        text: '[End Conversation]',
        response: null,
        close: true,
      }
    ]
  },

  // Trade District NPCs
  blacksmith: {
    id: 'blacksmith',
    name: 'Garret the Blacksmith',
    location: 'blacksmith',
    unlocked: true,
    greeting: "Hmph. Another traveler. If you need weapons forged, you've come to the right place. I used to make plows and horseshoes. Now it's all swords and shields.",
    topics: [
      {
        id: 'about_weapons',
        text: 'Can you forge me something special?',
        response: "I can forge decent blades, but the real materials... they're buried in the graveyard. Bring me rare metal and I'll make you something legendary.",
        affection: 0,
      },
      {
        id: 'about_himself',
        text: 'How did you end up here?',
        response: "I was the finest smith in the valley. When the dead rose, my forge was the first thing they destroyed. I've been tempering steel and tempering my patience ever since.",
        affection: 0,
      },
      {
        id: 'end',
        text: '[End Conversation]',
        response: null,
        close: true,
      }
    ]
  },

  tavern_keeper: {
    id: 'tavern_keeper',
    name: 'Mira the Tavern Keeper',
    location: 'tavern',
    unlocked: true,
    greeting: "Welcome, weary soul! Sit down, have a drink. Well... we're out of ale. But I've got stories, and those are free.",
    topics: [
      {
        id: 'rumors',
        text: 'Any rumors from the road?',
        response: "Travelers say the Gravekeeper wasn't always a monster. Some say he was a good man once, until something broke inside him. Tragic, really.",
        affection: 0,
      },
      {
        id: 'about_tavern',
        text: 'This place used to be lively, huh?',
        response: "Lively? It was the heart of the village! Singing, dancing, feasts every fortnight. Now it's just me and the rats. But we keep the lights on. Hope is important.",
        affection: 1,
      },
      {
        id: 'end',
        text: '[End Conversation]',
        response: null,
        close: true,
      }
    ]
  },

  // Residential NPCs
  worried_refugee: {
    id: 'worried_refugee',
    name: 'Anxious Refugee',
    location: 'residential',
    unlocked: true,
    greeting: "*shivers* Did you hear that last night? Groaning from the graveyard. They're getting closer every day...",
    topics: [
      {
        id: 'weather',
        text: 'How are you holding up?',
        response: "The nights are getting colder. My children are sick. I don't know how much longer we can survive here. But at least you fight for us. That means something.",
        affection: 0,
      },
      {
        id: 'zombies',
        text: 'Are the zombies really getting closer?',
        response: "Every night I hear them. Scratching at the walls, moaning. Elder Rowan says we're safe, but I've seen them in the treeline. They're watching us.",
        affection: 0,
      },
      {
        id: 'end',
        text: '[End Conversation]',
        response: null,
        close: true,
      }
    ]
  },

  weather_watcher: {
    id: 'weather_watcher',
    name: 'Old Sarah',
    location: 'residential',
    unlocked: true,
    greeting: "Rain's coming. My bones always know. *looks at the sky* Dark clouds gathering over the graveyard...",
    topics: [
      {
        id: 'weather',
        text: 'What do you think about the weather?',
        response: "Storm's brewing. Good for the crops — if we had any left. Bad for morale. People get anxious when the sky goes dark. Reminds them of... you know.",
        affection: 0,
      },
      {
        id: 'old_days',
        text: 'Tell me about the old days.',
        response: "Oh honey, I remember when this was all green fields. Markets full of flowers, children laughing. Now look at us. Huddled around campfires, jumping at shadows.",
        affection: 0,
      },
      {
        id: 'end',
        text: '[End Conversation]',
        response: null,
        close: true,
      }
    ]
  },
};
