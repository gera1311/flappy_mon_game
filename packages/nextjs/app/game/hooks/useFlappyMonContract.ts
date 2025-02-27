// useFlappyMonContract.ts
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
const CONTRACT_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

export const useFlappyMonContract = () => {
  const { address } = useAccount();

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

  const currentDay = Math.floor(Date.now() / 1000 / (24 * 60 * 60));
  const canCheckIn = lastCheckIn < currentDay;

  return {
    lastCheckIn,
    attemptsLeft,
    totalScore,
    highScore,
    canCheckIn,
    checkIn: () =>
      checkIn({
        address: CONTRACT_ADDRESS,
        abi: FLAPPY_MON_ABI,
        functionName: "checkIn",
      }),
    recordGame: (score: number) =>
      recordGame({
        address: CONTRACT_ADDRESS,
        abi: FLAPPY_MON_ABI,
        functionName: "recordGame",
        args: [BigInt(score)],
      }),
    refetch,
  };
};
