# Phase 5 architecture

Phase 5 adds a deterministic competitive-match director beside the existing physics and human-agent simulation. Player and ball contacts remain physical; the director interprets those contacts through football laws and emits authoritative decisions, restarts, cards, VAR reviews and tactical telemetry.

## Runtime flow

1. Human agents create physical ball contacts and tackle assessments.
2. The competitive director records possession, last touch and pass receivers.
3. The laws module evaluates active offside involvement, pitch exits, fouls, advantage, cards and penalties.
4. The restart engine freezes and places the Rapier ball, arranges team anchors and releases the selected routine.
5. VAR temporarily freezes the authoritative ball state and resolves configured review categories.
6. The presentation layer renders referee crews, assistant flags, offside guides, restart markers and VAR stadium messaging.
7. Network snapshots expose only deterministic, gameplay-relevant state.

The director does not replace the human, audio or living-world systems. It coordinates them through semantic events.
