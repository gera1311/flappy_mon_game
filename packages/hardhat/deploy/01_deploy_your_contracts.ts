import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployFlappyMonContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Деплой контракта FlappyMonContract
  await deploy("FlappyMonContract", {
    from: deployer, // Адрес деплоера
    args: [], // Аргументы конструктора (нет в данном случае)
    log: true, // Вывод логов
    autoMine: true, // Автоматический майнинг для локальной сети
  });

  console.log("FlappyMonContract deployed successfully!");
};

export default deployFlappyMonContract;
deployFlappyMonContract.tags = ["FlappyMonContract"];
