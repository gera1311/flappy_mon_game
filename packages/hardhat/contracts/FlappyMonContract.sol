// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FlappyMonContract {
    // Структура для данных пользователя
    struct UserData {
        uint256 lastCheckIn; // Время последнего чека (в секундах с эпохи)
        uint8 attemptsLeft;  // Оставшиеся попытки на день
        uint256 totalScore;  // Сумма всех очков
        uint256 highScore;   // Рекорд пользователя
    }

    // Маппинг адресов пользователей к их данным
    mapping(address => UserData) public users;

    // События для логирования
    event CheckedIn(address indexed user, uint256 timestamp);
    event GamePlayed(address indexed user, uint256 score, uint256 newTotalScore, uint256 newHighScore);
    
    // Период в секундах для нового дня (24 часа)
    uint256 constant DAY_SECONDS = 24 * 60 * 60;

    // Функция чека
    function checkIn() external {
        UserData storage user = users[msg.sender];
        uint256 currentTime = block.timestamp;

        // Проверяем, прошел ли день с последнего чека
        if (currentTime >= user.lastCheckIn + DAY_SECONDS) {
            user.lastCheckIn = currentTime;
            user.attemptsLeft = 3; // Даем 3 попытки на новый день
            emit CheckedIn(msg.sender, currentTime);
        } else {
            require(user.attemptsLeft > 0, "No attempts left today!");
        }
    }

    // Функция записи результата игры
    function recordGame(uint256 score) external {
        UserData storage user = users[msg.sender];
        uint256 currentTime = block.timestamp;

        // Проверяем, что пользователь сделал чек сегодня
        require(currentTime < user.lastCheckIn + DAY_SECONDS, "Please check in first!");
        require(user.attemptsLeft > 0, "No attempts left today!");

        // Уменьшаем количество попыток
        user.attemptsLeft -= 1;

        // Обновляем общий счет и рекорд
        user.totalScore += score;
        if (score > user.highScore) {
            user.highScore = score;
        }

        emit GamePlayed(msg.sender, score, user.totalScore, user.highScore);
    }

    // Функция получения данных пользователя
    function getUserData(address userAddress) external view returns (uint256 lastCheckIn, uint8 attemptsLeft, uint256 totalScore, uint256 highScore) {
        UserData memory user = users[userAddress];
        return (user.lastCheckIn, user.attemptsLeft, user.totalScore, user.highScore);
    }
}