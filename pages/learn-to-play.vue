<script setup>
</script>

<template>
  <div class="flex flex-col items-center justify-center container m-4">
    <ArticleHeading :subTitle="'Draw Board Game'" />

    <ArticleCard
      :title="'Setup:'"
      :description="`Shuffle the Draw cards and deal one to each player. Each card reveals a location except for one, which designates the player as the spy.
    Set a timer for the desired round duration (usually 8 minutes).
    Decide who starts as the questioner.`"
    />
    <ArticleCard
      :title="'Gameplay:'"
      :description="`Draw is played in rounds, and each round consists of players asking and answering questions to uncover the spy or location. Here's how a typical round progresses:`"
    />
    <ArticleCard
      :title="'Ask Questions:'"
      :description="`Players take turns asking each other
    questions about the location. Questions should be open-ended and designed to
    reveal information about the location without giving it away completely. For
    example: 'What's the weather like here?' 'What kind of people are around?'
    'What can you order to eat?'`"
    />
    <ArticleCard
      :title="'Answer Wisely'"
      :description="`All players, including the spy, must provide answers that match the location while trying not to give away their roles. The spy's goal is to blend in, and the other players aim to identify the spy based on their answers.`"
    />
    <ArticleCard
      :title="'Timer Tension'"
      :description="`Keep an eye on the timer. When it runs out, players must cast their votes:

Non-Spies: Point to the player they suspect is the spy.
Spy: Attempt to guess the location.`"
    />
    <ArticleCard
      :title="'Reveal and Scoring'"
      :description="`After the timer expires or if the spy makes a guess, reveal the roles and the location card. Scoring depends on the outcome:

If the spy guesses the location, they win.
If the non-spies correctly identify the spy, they win.
If the spy goes undetected and cannot guess the location, the spy wins.`"
    />
    <ArticleCard
      :title="'Change Roles'"
      :description="`Pass the questioner role to the next player and shuffle the cards for a new round. Continue until you decide to end the game.`"
    />
    <ArticleCard
      :title="'Variations'"
      :description="`Draw offers endless entertainment, and you can spice things up with variations such as different time limits, additional spy roles, or house rules to keep the game fresh and exciting.`"
    />
    <ArticleCard
      :title="'Conclusion'"
      :description="`Draw is a thrilling social deduction board game that guarantees laughs, suspense, and unforgettable moments. Whether you're the spy or a non-spy, the key to success lies in mastering the art of deception and deduction. Gather your friends, put on your spy hats, and embark on an unforgettable journey to discover the secrets hidden within Draw's diverse locations. Are you up for the challenge?

Now that you know how to play Draw, it's time to put your espionage skills to the test and enjoy countless hours of espionage-themed fun!`"
    />
  </div>
</template>



<style>
</style>