      const catchQuality = profile.ability.goalkeeper * runtime.physical.balance * (1 - runtime.physical.fatigue * 0.2)
      if (catchQuality > 0.72 && ballVelocity.length() < 15) {
        ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
        ball.applyImpulse({ x: -attackDirection(team) * 6.8, y: 1.8, z: -ballPosition.z * 0.16 }, true)
        onSoundEvent('goalkeeper-catch', { team, position: [ballPosition.x, ballPosition.y, ballPosition.z], force: result.soundForce })
      } else {
        ball.applyImpulse({ x: result.impulse.x, y: Math.max(1.2, result.impulse.y), z: result.impulse.z }, true)
        onSoundEvent('goalkeeper-parry', { team, position: [ballPosition.x, ballPosition.y, ballPosition.z], force: result.soundForce })
      }
      onAction('save', team)
      humanWorld.telemetry.goalkeeperReactionMs = Math.round(THREE.MathUtils.lerp(340, 115, profile.ability.reactions * profile.ability.goalkeeper))
    } else {
      ball.applyImpulse({ x: result.impulse.x, y: result.impulse.y, z: result.impulse.z }, true)
      ball.applyTorqueImpulse({ x: result.torque.x, y: result.torque.y, z: result.torque.z }, true)
      const event: FootballAudioEvent = technique === 'header' ? 'header' : action === 'shoot' ? 'shot-taken' : action === 'pass' ? 'pass-completed' : action === 'tackle' || action === 'intercept' ? 'slide-tackle' : result.heavyTouch ? 'heavy-touch' : 'ball-kicked'
      onSoundEvent(event, { team, position: [ballPosition.x, ballPosition.y, ballPosition.z], force: result.soundForce, speed: ballVelocity.length(), wetness: weather === 'rain' ? weatherIntensity : 0 })
      if (action === 'shoot') onAction('shot', team)
      if (action === 'pass') onAction('pass', team)
      if (action === 'tackle' || action === 'intercept') {
        const opponentInfo = nearestOpponent(runtime.id, team, humanWorld)
        if (opponentInfo && opponentInfo.distance < 1.35) {
          const opponentGoalX = team === 'home' ? HALF_LENGTH : -HALF_LENGTH
          const lastDefender = Math.abs(opponentInfo.player.position.x - opponentGoalX) < 18
          const assessment = assessTackle(runtime, profile, opponentInfo.player, ballPosition, result.soundForce, lastDefender)
          opponentInfo.player.physical.balance = Math.max(0.18, opponentInfo.player.physical.balance - result.soundForce * 0.38)
          if (assessment.foul) {
            updateRelationshipAfterEvent(humanWorld.relationships, runtime.id, opponentInfo.player.id, 'foul')
            onFoul({
              team,
              playerId: runtime.id,
              opponentId: opponentInfo.player.id,
              position: [ballPosition.x, ballPosition.y, ballPosition.z],
              assessment,
              lastDefender,
              timestamp: performance.now() / 1000,
            })
