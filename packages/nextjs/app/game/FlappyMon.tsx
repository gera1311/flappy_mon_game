"use client";

import React, { useEffect, useRef, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

// Константы игры
const CANVAS_WIDTH = 450;
const CANVAS_HEIGHT = 600;
const BIRD_X = 50;
const BIRD_SIZE = 20;
const GRAVITY = 0.6;
const FLAP_VELOCITY = -11;
const PIPE_WIDTH = 60;
const PIPE_GAP = 180;
const PIPE_SPEED = 2;
const PIPE_SPACING = 180;

const FlappyBird: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bird, setBird] = useState({ y: CANVAS_HEIGHT / 2, vy: 0 });
  const [pipes, setPipes] = useState<{ x: number; gapY: number; scored: boolean }[]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const { address, isConnected } = useAccount();

  // Игровой цикл
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const gameLoop = setInterval(() => {
      setBird(prev => {
        const newVy = prev.vy + GRAVITY;
        let newY = prev.y + newVy;

        if (newY < 0 || newY + BIRD_SIZE > CANVAS_HEIGHT) {
          setGameOver(true);
          newY = Math.max(0, Math.min(newY, CANVAS_HEIGHT - BIRD_SIZE));
        }
        return { y: newY, vy: newVy };
      });

      setPipes(prevPipes => {
        const updatedPipes = prevPipes.map(pipe => ({ ...pipe, x: pipe.x - PIPE_SPEED }));
        const filteredPipes = updatedPipes.filter(pipe => pipe.x > -PIPE_WIDTH);

        const lastPipe = filteredPipes[filteredPipes.length - 1];
        if (!lastPipe || lastPipe.x <= CANVAS_WIDTH - PIPE_SPACING) {
          const gapY = Math.random() * (CANVAS_HEIGHT - 200) + 100;
          filteredPipes.push({ x: CANVAS_WIDTH, gapY, scored: false });
        }

        filteredPipes.forEach(pipe => {
          if (pipe.x < BIRD_X && !pipe.scored) {
            pipe.scored = true;
            setScore(prev => prev + 1);
          }
        });

        return filteredPipes;
      });
    }, 1000 / 60);

    return () => clearInterval(gameLoop);
  }, [gameStarted, gameOver]);

  // Проверка столкновений
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    pipes.forEach(pipe => {
      if (
        BIRD_X + BIRD_SIZE > pipe.x &&
        BIRD_X < pipe.x + PIPE_WIDTH &&
        (bird.y < pipe.gapY - PIPE_GAP / 2 || bird.y + BIRD_SIZE > pipe.gapY + PIPE_GAP / 2)
      ) {
        setGameOver(true);
      }
    });
  }, [bird.y, pipes, gameStarted, gameOver]);

  // Рендеринг
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#1A1A2E";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = "#00FF00";
    pipes.forEach(pipe => {
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY - PIPE_GAP / 2);
      ctx.fillRect(pipe.x, pipe.gapY + PIPE_GAP / 2, PIPE_WIDTH, CANVAS_HEIGHT - (pipe.gapY + PIPE_GAP / 2));
      ctx.strokeStyle = "#FFFFFF";
      ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY - PIPE_GAP / 2);
      ctx.strokeRect(pipe.x, pipe.gapY + PIPE_GAP / 2, PIPE_WIDTH, CANVAS_HEIGHT - (pipe.gapY + PIPE_GAP / 2));
    });

    ctx.fillStyle = "#FF3333";
    ctx.fillRect(BIRD_X, bird.y, BIRD_SIZE, BIRD_SIZE);
    ctx.strokeStyle = "#FFFFFF";
    ctx.strokeRect(BIRD_X, bird.y, BIRD_SIZE, BIRD_SIZE);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "20px Arial";
    ctx.fillText(`Score: ${score}`, 15, 30);

    if (gameOver) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = "#FF3333";
      ctx.font = "40px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Game Over", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "20px Arial";
      ctx.fillText(`Score: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    }
  }, [bird.y, pipes, score, gameOver]);

  // Управление вводом
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " && gameStarted && !gameOver) {
        e.preventDefault();
        setBird(prev => ({ ...prev, vy: FLAP_VELOCITY }));
      }
    };

    const handleClick = () => {
      if (gameStarted && !gameOver) {
        setBird(prev => ({ ...prev, vy: FLAP_VELOCITY }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("click", handleClick);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (canvas) {
        canvas.removeEventListener("click", handleClick);
      }
    };
  }, [gameStarted, gameOver]);

  // Старт/рестарт игры
  const startGame = () => {
    setBird({ y: CANVAS_HEIGHT / 2, vy: 0 });
    setPipes([
      { x: CANVAS_WIDTH - 50, gapY: Math.random() * (CANVAS_HEIGHT - 200) + 100, scored: false },
      { x: CANVAS_WIDTH - 50 + PIPE_SPACING, gapY: Math.random() * (CANVAS_HEIGHT - 200) + 100, scored: false },
    ]);
    setScore(0);
    setGameOver(false);
    setGameStarted(true); // Запускаем игру
  };

  // Если кошелек не подключен, показываем только кнопку подключения
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center p-4">
        <h2 className="text-3xl font-bold text-primary neon-text">Flappy Bird</h2>
        <p className="text-lg text-secondary mb-4">Please connect your wallet to play</p>
        <ConnectButton />
      </div>
    );
  }

  // Основной рендеринг игры
  return (
    <div className="flex flex-col items-center p-4">
      <h2 className="text-3xl font-bold text-primary neon-text">Flappy Bird</h2>
      <p className="text-lg text-secondary">Score: {score}</p>
      <p className="text-sm text-gray-400 mb-2">
        Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
      </p>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border border-primary shadow-neon"
      />
      {!gameStarted ? (
        <button onClick={startGame} className="mt-4 btn btn-primary btn-lg hover:animate-pulse">
          Start Game
        </button>
      ) : gameOver ? (
        <button onClick={startGame} className="mt-4 btn btn-primary btn-lg hover:animate-pulse">
          Restart
        </button>
      ) : null}
    </div>
  );
};

export default FlappyBird;
