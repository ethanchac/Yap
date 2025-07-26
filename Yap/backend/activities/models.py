class WouldYouRather:
    def __init__(self, option_a, option_b, votes_a=0, votes_b=0):
        self.option_a = option_a
        self.option_b = option_b
        self.votes_a = votes_a
        self.votes_b = votes_b

    def to_dict(self):
        return {
            'option_a': self.option_a,
            'option_b': self.option_b,
            'votes_a': self.votes_a,
            'votes_b': self.votes_b
        }
    
