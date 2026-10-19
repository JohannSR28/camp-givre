'use client';

import { useEffect } from 'react';
import { startGame } from '../src/game/engine';

export default function Game() {
  useEffect(() => startGame(), []);

  return (
    <>
      <div id="stage"></div>
      <div id="hud">
        <div className="brand"><span className="b1">CAMP</span><span className="b2">GIVRÉ</span></div>
        <button id="mute" aria-label="Couper le son">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 9h4l5-4v14l-5-4H4z" fill="#fff" />
            <path id="waves" d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
            <path id="cross" d="M17 9l5 6M22 9l-5 6" style={{ display: 'none' }} />
          </svg>
        </button>
        <div className="res">
          {['cash', 'wood', 'meat', 'gold', 'plank', 'steak', 'ingot', 'tool'].map((k) => [
            <div key={k} className="pill" id={'p-' + k} hidden={k !== 'cash' && k !== 'wood'}>
              <img alt="" /><b>0</b>
            </div>,
            k === 'cash' && <div key="income" id="income" className="income" hidden>+0 $/s</div>,
          ])}
        </div>
        <div id="toast"></div>
        <div id="hint">Glisse pour bouger</div>
      </div>
      <div id="joy"><div id="knob"></div></div>
      <div id="win" hidden>
        <div className="card">
          <h2>Le camp est sauvé !</h2>
          <p id="winText">Le grand fourneau est allumé.</p>
          <button id="winBtn">Continuer à jouer</button>
        </div>
      </div>
    </>
  );
}
