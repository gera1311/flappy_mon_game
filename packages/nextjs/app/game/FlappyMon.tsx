"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  BIRD_SIZE,
  BIRD_X,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FLAP_VELOCITY,
  GRAVITY,
  PIPE_GAP,
  PIPE_SPACING,
  PIPE_SPEED,
  PIPE_WIDTH,
} from "./utils/constants";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ethers } from "ethers";
import { useAccount, useReadContract, useWriteContract } from "wagmi";

// ABI смарт-контракта FlappyMonContract
const FLAPPY_MON_ABI = [
  {
    name: "getUserData",
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "lastCheckIn", type: "uint256" },
      { name: "attemptsLeft", type: "uint256" },
      { name: "totalScore", type: "uint256" },
      { name: "highScore", type: "uint256" },
    ],
  },
  {
    name: "checkIn",
    stateMutability: "nonpayable",
    type: "function",
    inputs: [],
    outputs: [],
  },
  {
    name: "recordGame",
    stateMutability: "nonpayable",
    type: "function",
    inputs: [{ name: "score", type: "uint256" }],
    outputs: [],
  },
];

// Адрес контракта
const CONTRACT_ADDRESS = "0x8987B3F9843A8fE516dCDFDeB91Ac84AC528b7b9";

const FlappyMon: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bird, setBird] = useState({ y: CANVAS_HEIGHT / 2, vy: 0 });
  const [pipes, setPipes] = useState<{ x: number; gapY: number; scored: boolean }[]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const { address, isConnected } = useAccount();

  // Чтение данных пользователя из контракта
  const { data: userData, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: FLAPPY_MON_ABI,
    functionName: "getUserData",
    args: [address],
    query: { enabled: !!address },
  }) as { data: [bigint, bigint, bigint, bigint] | undefined; refetch: () => void };

  const [lastCheckIn, attemptsLeft, totalScore, highScore] = userData ?? [0n, 0n, 0n, 0n];

  // Функции записи в контракт
  const { writeContract: checkIn } = useWriteContract({
    mutation: { onSuccess: () => refetch() },
  });

  const { writeContract: recordGame } = useWriteContract({
    mutation: { onSuccess: () => refetch() },
  });

  const currentDay = Math.floor(Date.now() / 1000);
  const canCheckIn = currentDay >= Number(lastCheckIn) + 24 * 60 * 60;

  // Игровой цикл
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const gameLoop = setInterval(() => {
      setBird(prev => {
        const newVy = prev.vy + GRAVITY;
        let newY = prev.y + newVy;

        if (newY < 0 || newY + BIRD_SIZE > CANVAS_HEIGHT) {
          setGameOver(true);
          recordGame({
            address: CONTRACT_ADDRESS,
            abi: FLAPPY_MON_ABI,
            functionName: "recordGame",
            args: [BigInt(score)], // Преобразуем score в BigInt
          });
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
    }, 1000 / 60); // 60 FPS

    return () => clearInterval(gameLoop);
  }, [gameStarted, gameOver, score, recordGame]);

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
        recordGame({
          address: CONTRACT_ADDRESS,
          abi: FLAPPY_MON_ABI,
          functionName: "recordGame",
          args: [BigInt(score)], // Преобразуем score в BigInt
        });
      }
    });
  }, [bird.y, pipes, gameStarted, gameOver, score, recordGame]);

  // Рендеринг
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const birdImage = new Image();
    birdImage.src = "/monadLogo.png"; // Путь к изображению в папке public

    birdImage.onload = () => {
      ctx.fillStyle = "#1A1A2E"; // Фон
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Отрисовка труб
      ctx.fillStyle = "#00FF00";
      pipes.forEach(pipe => {
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY - PIPE_GAP / 2);
        ctx.fillRect(pipe.x, pipe.gapY + PIPE_GAP / 2, PIPE_WIDTH, CANVAS_HEIGHT - (pipe.gapY + PIPE_GAP / 2));
        ctx.strokeStyle = "#FFFFFF";
        ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY - PIPE_GAP / 2);
        ctx.strokeRect(pipe.x, pipe.gapY + PIPE_GAP / 2, PIPE_WIDTH, CANVAS_HEIGHT - (pipe.gapY + PIPE_GAP / 2));
      });

      // Отрисовка изображения птицы
      ctx.drawImage(birdImage, BIRD_X, bird.y, BIRD_SIZE, BIRD_SIZE);

      // Отрисовка счета
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "20px Arial";
      ctx.textAlign = "left";
      ctx.fillText(`Score: ${score}`, 15, 30);

      // Экран "Game Over"
      if (gameOver) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)"; // Полупрозрачный фон
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = "#FF3333";
        ctx.font = "40px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Game Over", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "20px Arial";
        ctx.fillText(`Score: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
      }
    };

    // Обработка ошибки загрузки изображения
    birdImage.onerror = () => {
      console.error("Failed to load bird image");
    };
  }, [bird, pipes, score, gameOver, gameStarted]);

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
    if (canvas) canvas.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (canvas) canvas.removeEventListener("click", handleClick);
    };
  }, [gameStarted, gameOver]);

  // Старт/рестарт игры
  const startGame = () => {
    if (attemptsLeft === 0n) return; // Не начинаем игру, если нет попыток
    setBird({ y: CANVAS_HEIGHT / 2, vy: 0 });
    setPipes([
      { x: CANVAS_WIDTH - 50, gapY: Math.random() * (CANVAS_HEIGHT - 200) + 100, scored: false },
      { x: CANVAS_WIDTH - 50 + PIPE_SPACING, gapY: Math.random() * (CANVAS_HEIGHT - 200) + 100, scored: false },
    ]);
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
  };

  // Функция для выполнения чека
  const handleCheckIn = () => {
    if (!canCheckIn) return;
    checkIn({
      address: CONTRACT_ADDRESS,
      abi: FLAPPY_MON_ABI,
      functionName: "checkIn",
    });
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center p-4">
        <h2 className="text-3xl font-bold text-primary neon-text">Flappy MON</h2>
        <p className="text-lg text-secondary mb-4">Please connect your wallet to play</p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
      <div className="flex flex-row items-start gap-4 p-4">
        {/* Игровое поле */}
        <div className="flex flex-col items-center">
          <h2 className="text-3xl font-bold text-primary neon-text">FlappyMon</h2>
          <p className="text-lg text-secondary">Score: {score}</p>
          <p className="text-sm text-gray-400 mb-2">
            Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="border border-primary shadow-neon rounded-lg"
          />
          {!gameStarted ? (
            attemptsLeft > 0 ? (
              <button onClick={startGame} className="mt-4 btn btn-primary btn-lg hover:animate-pulse">
                Start Game
              </button>
            ) : (
              <p className="mt-4 text-lg text-red-500">Check in tomorrow and play again</p>
            )
          ) : gameOver ? (
            attemptsLeft > 0 ? (
              <button onClick={startGame} className="mt-4 btn btn-primary btn-lg hover:animate-pulse">
                Try Again
              </button>
            ) : (
              <p className="mt-4 text-lg text-red-500">Check in tomorrow and play again</p>
            )
          ) : null}
          <p className="text-sm text-gray-400 mt-4">Press SPACE or click to jump</p>
        </div>

        {/* Боковая панель */}
        <div className="flex flex-col gap-3 p-3">
          <div className="invisible">
            <h2 className="text-3xl font-bold">FlappyMon</h2>
            <p className="text-lg">Score: {score}</p>
            <p className="text-sm mb-2">Connected: placeholder</p>
          </div>
          <div className="flex flex-col bg-gray-800 p-4 rounded-lg shadow-neon w-64">
            <h3 className="text-xl font-bold text-primary neon-text mb-2">Player Stats</h3>
            <p className="text-sm text-gray-300">Attempts Left: {ethers.BigNumber.from(attemptsLeft).toString()}</p>
            <p className="text-sm text-gray-300">Total Score: {ethers.BigNumber.from(totalScore).toString()}</p>
            <p className="text-sm text-gray-300">High Score: {ethers.BigNumber.from(highScore).toString()}</p>
            <button onClick={handleCheckIn} className="mt-4 btn btn-secondary w-full" disabled={!canCheckIn}>
              {canCheckIn ? "Check In" : "Checked In Today"}
            </button>
          </div>
          {/* Leaderboard */}
          <div className="flex flex-col bg-gray-800 p-4 rounded-lg shadow-neon w-64">
            <h3 className="text-xl font-bold text-primary neon-text mb-2">Leaderboard</h3>
            <p className="text-sm text-gray-300">Coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlappyMon;
